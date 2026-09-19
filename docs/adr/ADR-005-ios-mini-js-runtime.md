# ADR-005: iOS embeds a minimal JS runtime, superseding ADR-001's schema interpreter

**Superseded by [ADR-008](ADR-008-ios-full-react-native.md)** — iOS now runs full React Native
(Hermes + JSI + Fabric) instead of this mini-runtime. Kept for history: the height-constraint bug
described in "Consequences" below was a real bug in the code this ADR introduced, and the
reasoning for why a mini-runtime was chosen over full RN in the first place is still useful
context for why ADR-008 was a considered decision, not a snap one.

## Status
Superseded — see above. Originally: Accepted, superseding ADR-001 and ADR-004.

## Context
ADR-001 ruled out embedding a live JS runtime in the iOS keyboard extension,
given Apple's tight extension memory ceiling, and required any proposal to
revisit that to be raised with the maintainer first (AGENTS.md Section 5).
That was raised and discussed explicitly in conversation: could iOS run the
*same* hand-written `example/src/keyboard/KeyboardApp.tsx` Android's live
`ReactHost` already renders — plain `View`/`Text`/`TouchableOpacity`,
`.map()`, `useState`, conditional rendering, style arrays — instead of only
ever reading a build-time-compiled static JSON schema (ADR-001/ADR-004),
which structurally cannot express `.map()`, state, or conditionals at all.
The maintainer approved proceeding.

## Decision
The extension now embeds `JavaScriptCore` (`JSContext`) — an iOS **system**
framework, always present, zero additional binary size — running:
1. A small hand-written prelude (`packages/ios/Resources/mini-react-runtime.js`):
   `useState`, an element-tree builder (`__h`, the JSX pragma target), and a
   synchronous mount/re-render loop. Not React, not React Native — just
   enough hooks + tree-building to run one hand-written component.
2. `KeyboardApp.tsx` compiled to plain JS by a **new**, separate compiler,
   `packages/core/src/compiler/miniReactBundle.ts` (`bundleKeyboardApp`):
   Babel (`@babel/core` + `@babel/preset-typescript` +
   `@babel/plugin-transform-react-jsx` with `pragma: '__h'`) strips types,
   compiles JSX to `__h(...)` calls, and rewrites `export default` into a
   `__mount(ComponentName)` call. Unlike `compileKeyboardSource` (ADR-001's
   compiler, still used as-is — see below), this transforms the *whole
   component*, so `.map()`/conditionals/`useState` become real runnable JS,
   not just statically-read structure.
3. `packages/ios/Sources/DynamicViewRenderer.swift`: walks the JS-produced
   `{ type, props, children }` tree (via `JSValue.forProperty`/`.atIndex` —
   `JSValue` has no Swift subscript operator) and renders real `UIView`s.
   Rebuilds the whole subtree on every render rather than diffing — a
   keyboard's tree is a few dozen nodes, so this is simple and fast enough,
   and matches how the schema renderer it replaces already behaved on every
   state change.
4. `packages/ios/Sources/JSKeyboardRuntime.swift`: owns the `JSContext`,
   injects `__nativeRender` plus one native-backed JS global per
   bridge-parity function the prelude implements (see below) as JS globals.

Only three import sources are recognized by the compiler — everything else
is a compile error, not a silent best-effort guess (same principle
`compileKeyboardSource` already followed): `"react"` (`useState`),
`"react-native"` (`View`/`Text`/`TouchableOpacity`/`StyleSheet`), and
`"react-native-keyboard-bridge"` — most of
`src/core/bridge.ts`'s function names, so the *same*
`KeyboardApp.tsx` can call them on both platforms.

**Bridge-function parity is not 1:1** — `UITextDocumentProxy`/
`UIInputViewController` (the only text-editing/input-switching API a
keyboard extension gets on iOS) is a much smaller surface than Android's
`InputConnection`. `commitText`, `getTextBeforeCursor`/`getTextAfterCursor`,
`getSelectedText`, `switchToPreviousInputMethod`/`switchToNextInputMethod`,
`performHapticFeedback`, `playClickSound`, and `getCursorCapsMode` (the last
two approximated, see the prelude's comments) have real iOS
implementations; `deleteSurroundingText`'s `after` argument is a silent
no-op (no forward-delete API exists). Everything with no iOS equivalent at
all — `setSelection`, `getExtractedText`, `sendKeyEvent`,
`performEditorAction`, `setComposingText`/`setComposingRegion`/
`finishComposingText`, `beginBatchEdit`/`endBatchEdit`,
`getCurrentEditorInfo`, `onEditorInfoChange`/`onSelectionChange`,
`hideKeyboard` — is still defined in the prelude, as a **safe no-op** (or a
resolved safe default for value-returning ones), rather than left undefined
(which would surface as a bare, confusing `ReferenceError`) — the same
convention `src/core/bridge.ts` itself already follows when
its native module isn't available. See
`packages/ios/Resources/mini-react-runtime.js`'s header comment and
docs/api.md's parity table for the full list and reasoning per function.
`performHapticFeedback` additionally silently no-ops on iOS unless the user
has granted the extension "Allow Full Access" — an Apple-imposed
restriction on keyboard extensions, not a bug here.

**Why not go further and embed real React Native (Hermes + JSI + Fabric)?**
Raised and rejected in the same conversation. That would reintroduce exactly
what ADR-001 avoided: a much larger memory/binary footprint, slower cold
start, Fabric's shadow-tree/Yoga machinery (unneeded for ~30 simple nodes),
and more Store-review surface — for zero benefit, since JSI's actual value
(synchronous host calls without a bridge) is moot when the engine is already
embedded in-process with no bridge to cross. `JSContext`/`JSValue` already
give direct, synchronous, zero-serialization native calls.

**Why the whole element tree is rebuilt natively on every render, not
diffed.** Same reasoning as the schema renderer it replaces: a keyboard's
tree is tiny, so the complexity of a real reconciler isn't worth it.

**`bundleKeyboardApp` must never be reachable from `packages/core`'s main
barrel (`src/index.ts`).** It pulls in the full `@babel/core` transform
pipeline (`@babel/helper-module-transforms` etc.), which requires Node
builtins (`assert`) that don't exist in a React Native app's JS bundle. When
this was briefly exported from the barrel, any app depending on
`@react-native-keyboard-bridge/core` for anything (even just the `KeyLayout`
schema types, via `react-native-keyboard-bridge`'s `<CustomKeyboard>`
component) broke at Metro-bundle time with `Unable to resolve module assert`.
Fixed by keeping `bundleKeyboardApp` a deep-import-only, build-time-only
export (`scripts/build-ios-keyboard-bundle.js` requires
`@react-native-keyboard-bridge/core/dist/compiler/miniReactBundle` directly)
and moving `@babel/core`/`@babel/preset-typescript`/
`@babel/plugin-transform-react-jsx` to `devDependencies`. `compileKeyboardSource`
(ADR-001's original compiler, `@babel/parser`/`@babel/traverse` only) stays
exported from the main barrel as before — it has no such transitive Node-only
dependency and has not caused this problem.

**The compiled bundle is app-owned, generated output — not committed-by-hand
library code.** `example/ios/CustomKeyboardExtension/KeyboardApp.compiled.js`
is regenerated by running `node scripts/build-ios-keyboard-bundle.js`
whenever `KeyboardApp.tsx` changes; it is not produced by Xcode's build
itself. This mirrors `example/ios/CustomKeyboardExtension/Info.plist`, which
moved out of `packages/ios` in the same pass for the same reason (see
docs/api.md): the keyboard's actual content/branding is the app's identity,
not the library's.

## Consequences
- **Removed** (superseded, not merely unused): `packages/ios/Sources/KeyLayoutSchema.swift`,
  `SchemaRenderer.swift`, the old `KeyButton.swift` (replaced by the generic
  `TouchableOpacityButton.swift`), `Resources/{en-qwerty,bn-sample}.json`,
  and their tests (`KeyLayoutSchemaTests.swift`, `SchemaRendererTests.swift`,
  `Fixtures/sample-schema.json`). `KeyboardViewController`'s bundled-layout
  cycling (`switchLanguage` between `en-qwerty`/`bn-sample`) is gone with it —
  there is one hand-written `KeyboardApp.tsx`, matching Android exactly, not
  a list of bundled schema layouts to cycle through.
- **Known gap, not yet closed:** no XCTest coverage was rebuilt for
  `DynamicViewRenderer`/`JSKeyboardRuntime` in this pass (the old
  `CustomKeyboardExtensionTests` target, which tested deleted schema code,
  was removed rather than repurposed). Verification for this ADR was: (1)
  `packages/core`'s `miniReactBundle.test.ts` — the compiled bundle actually
  *executes* against a fake mini-runtime and produces the expected tree,
  including a real `useState`/`.map()`/conditional-rendering pass; (2) a
  plain-Node run of the real generated bundle + the real
  `mini-react-runtime.js` together (not a fake), confirming 30 rendered
  nodes in the expected shape; (3) `xcodebuild` succeeds for both the app
  and extension targets with zero errors; (4) `nm`/`strings` on the built
  extension binary confirm `JSKeyboardRuntime`'s initializer signature,
  `TouchableOpacityButton`/`KeyboardViewController`'s ObjC classes, and both
  bundled `.js` resources (byte-identical to source) are present; (5) the
  app launches without crashing post-fix and Metro serves a clean bundle
  (verifying the `assert`-resolution regression above is actually fixed).
  Per ADR-004 and AGENTS.md, live UI automation (enabling the keyboard in
  Settings, tapping through it) was not attempted — already documented there
  as unreliable to automate, not a gap introduced by this ADR.
- `packages/ios/setup_xcode_targets.rb` is now idempotent by *recreation*
  (tears down and rebuilds `CustomKeyboardExtension`'s target/groups/file
  references every run) rather than by skipping when already present — more
  reliable than patching an existing target's file list as it changes over
  time.
- **Bridge-function parity widened** (a later pass in this same ADR, not a
  new one): the prelude went from 2 native-backed functions
  (`commitText`/`deleteSurroundingText`) to the full parity surface
  described above, so a hand-written `KeyboardApp.tsx` can call
  `getTextBeforeCursor`/`switchToNextInputMethod`/`performHapticFeedback`/etc.
  identically on both platforms, with unsupported ones resolving a safe
  default instead of a bare `ReferenceError`. Same known-gap caveat as above applies: no XCTest
  coverage exists yet for the new native closures in
  `JSKeyboardRuntime.swift`/`KeyboardViewController.swift` (verified instead
  by `xcodebuild` success and reading the `UITextDocumentProxy`/
  `UIInputViewController`/`UIInputViewAudioFeedback` APIs used against
  Apple's documented contracts — no simulator UI pass was possible, per the
  existing automation limitation).
- **Critical fix, found via the ADR-007 experiment's simulator pass (the first time this repo
  ever got real GUI/simulator verification working — see that ADR):** `KeyboardViewController`'s
  `view` never had an explicit height constraint. A `UIInputViewController`'s view has no
  inherent height — nothing in UIKit provides one automatically the way a normal screen gets one
  from its window. Without it, `applyRenderedTree`'s four-edge-pinned constraints still resolved
  a valid *width* but a height of exactly 0, meaning **the keyboard was very likely invisible in
  every real build up to this point**, despite every prior verification (build success,
  `nm`/`strings` binary inspection, `miniReactBundle.test.ts`) passing — none of those catch a
  rendering-invisible-at-runtime bug. Fixed by `setUpKeyboardHeight()`, a required
  `view.heightAnchor.constraint(equalToConstant: 216)` added in `viewDidLoad`. **Confirmed
  visually for the first time this session**: a real QWERTY keyboard render, and real committed
  text (`textDocumentProxy.insertText` actually inserting characters typed through the on-screen
  keys) in the iOS Simulator, via `xcrun simctl` + `cliclick` automation (see ADR-007 for exactly
  how — the same technique was assumed not to work in this environment earlier in this project's
  history, based on one earlier failed attempt with stale window coordinates; it does work once
  the coordinates/simulator state are right). This closes a real portion of the "Known gap"
  below — visual rendering is no longer unverified, though XCTest coverage still is.
