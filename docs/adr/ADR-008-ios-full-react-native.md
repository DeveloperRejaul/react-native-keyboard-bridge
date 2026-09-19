# ADR-008: iOS runs full React Native (Hermes + JSI + Fabric), replacing the mini-runtime

## Status
Accepted — supersedes ADR-005 (and, transitively, ADR-001/ADR-004). Promotes ADR-007's
experiment to the production path.

## Context
ADR-005 embedded a small hand-rolled JS runtime (`JavaScriptCore` + a hand-written prelude) in
the iOS keyboard extension, explicitly rejecting full React Native (Hermes + JSI + Fabric) over
memory-ceiling, binary-size, and cold-start concerns — and because RN's iOS internals were
assumed (never verified) to call `UIApplication.shared`, an API unavailable to extensions.

The maintainer asked, explicitly, to try full RN anyway (ADR-007). That spike found:
1. `pod install`/`xcodebuild` both succeed with RN's New Architecture pods (Hermes, Fabric,
   ReactCommon) linked into the keyboard extension's own App Extension target.
2. `RCTReactNativeFactory`'s lower-level `rootViewFactory.view(withModuleName:)` returns a plain
   `UIView` without ever needing a `UIWindow` (which doesn't exist in an extension process) —
   the same shape of primitive Android's `ReactHostImpl.createSurface(...)` already gives
   `CustomKeyboardService.kt`.
3. A real simulator run (`xcrun simctl` + `cliclick`, see ADR-007's write-up for exactly how)
   showed the JS thread reaching a normal idle steady state, no crash, and — after fixing a real,
   separate bug this investigation surfaced (`KeyboardViewController`'s `view` had no height
   constraint, affecting the *old* mini-runtime too — see ADR-005's "Consequences") — an actual
   rendered keyboard and (once this ADR's native bridge module was added) real committed text.

No evidence of an `UIApplication.shared` crash surfaced in this testing, though Simulator is more
lenient about extension sandboxing than a real device (e.g. this session's extension could reach
Metro's dev server over the network, which requires "Allow Full Access" on a real device).

## Decision
The iOS keyboard extension now runs the same New Architecture stack Android already does:
1. `RNKeyboardBootstrap.swift` boots `RCTReactNativeFactory` + `RCTAppDependencyProvider` and
   requests a `"KeyboardApp"` surface — the exact same component name/registration Android's
   `CustomKeyboardService` requests from its own `ReactHost`, from the exact same JS bundle (see
   `example/index.js` registering both the app's own component and `"KeyboardApp"`).
2. `KeyboardBridgeModule.swift`/`.m` — the iOS counterpart to `android/`'s
   `KeyboardBridgeModule.kt`, registered as `NativeModules.KeyboardBridge` (auto-registered via
   Objective-C runtime class scanning — no explicit package list needed, unlike Android). Backed
   by `UITextDocumentProxy`/`UIInputViewController`, reached via a `static weak var current`
   on `KeyboardViewController` (a bridge module has no view of its own). Implements the same
   parity split as before: real implementations for `commitText`/`getTextBeforeCursor`/
   `switchToNextInputMethod`/`performHapticFeedback`/etc., safe no-ops for the functions with no
   iOS equivalent (`setSelection`, composing-text, batch-edit, etc. — see docs/api.md's parity
   table, unchanged in *content*, just re-homed from a JS-side shim to a real native module).
3. `src/core/bridge.ts` **now runs unmodified on both platforms** — no more
   separate mini-runtime reimplementation of its function names. `NativeModules.KeyboardBridge`
   resolves to a real module either way.
4. The JS bundle is a plain `main.jsbundle` (`react-native bundle`, via `bin/cli.js`'s
   `build-keyboard`), not a custom-compiled subset — `.map()`, conditionals, `useState`,
   `useEffect`, any hook, any npm package: everything real React Native supports now works
   identically on both platforms, closing the capability gap ADR-005 always had by construction.

**Removed** (superseded, not merely unused): `src/core/compiler/` (the whole
`bundleKeyboardApp` Babel-based compiler and its test), `tsconfig.compiler.json`,
`@babel/core`/`@babel/preset-typescript`/`@babel/plugin-transform-react-jsx` dependencies,
`ios/JSKeyboardRuntime.swift`, `ios/DynamicViewRenderer.swift`, `ios/TouchableOpacityButton.swift`,
`ios/UIColor+Hex.swift`, `ios/Resources/mini-react-runtime.js`. `bin/cli.js`'s `build-keyboard`
now wraps the standard `react-native bundle` CLI instead of a custom compiler.

**New consumer-facing requirement:** the extension's own Podfile target needs a second
`use_react_native!` block (see README/docs/api.md) — `setup-ios` checks for this and prints the
exact snippet to add if missing, rather than editing the Podfile itself (Podfiles are hand-
maintained Ruby, too risky to blindly rewrite).

## Consequences
- **Binary size grows substantially**: the extension's `.appex` went from ~130KB (JavaScriptCore-
  only) to ~3.7MB (Hermes + Fabric + the JS bundle) in this session's Simulator build. Real device
  numbers (and, more importantly, *resident memory* under the actual enforced extension ceiling)
  are still unmeasured — Simulator does not enforce Apple's real device memory limit. **This is
  the one real open risk from ADR-001's original concern that this ADR does not close.** Test on
  a real device before shipping to production; if the extension gets killed for memory pressure
  in real-world use, revisit this decision.
- Known gap, unchanged from ADR-005/ADR-007: no XCTest coverage for `RNKeyboardBootstrap`/
  `KeyboardBridgeModule`; verification for this ADR was a real Simulator run (screenshots +
  `lldb`/log inspection), not automated tests. Add XCTest coverage before relying on this beyond
  what `example/src/keyboard/KeyboardApp.tsx` already exercises.
- `docs/adr/ADR-005-ios-mini-js-runtime.md` and `ADR-007-ios-full-rn-experiment.md` are kept for
  history (marked superseded) — the mini-runtime's design rationale and the experiment's raw
  findings remain useful context for why this ADR exists.
