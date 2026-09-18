# AGENTS.md — react-native-custom-keyboard

Instructions for any AI coding agent (Claude Code, etc.) working in this repository.
Read this file fully before making changes. Follow it exactly unless the human
maintainer explicitly overrides something in the conversation.

## 1. Project Summary

`react-native-custom-keyboard` is an open-source React Native library that lets a
developer design a mobile system keyboard (an Android IME / iOS Custom Keyboard
Extension) using ordinary React Native components (JSX, `View`, `Text`,
`TouchableOpacity`, StyleSheet, etc.), instead of writing the keyboard UI natively
in Kotlin/Swift.

The `example/` app in this repo is both a test harness for the library AND a real,
shippable keyboard app that demonstrates the library end to end. Treat it as a
first-class citizen, not a throwaway demo — code quality there matters as much as
in the library itself.

## 2. High-Level Architecture

Everything publishes as ONE npm package, `react-native-custom-keyboard` (see
ADR-006) — a consumer only ever runs `yarn add react-native-custom-keyboard`.
Do not re-split it back into multiple packages without a new ADR.

```
packages/react-native/   <- the only published package
  src/                   <- pure TypeScript
                            - bridge.ts/settings.ts: the JS bridge/settings
                              functions (Android-backed; see below)
                            - Key/KeyRow data shape, gesture/swipe-typing
                              logic, word-prediction interfaces
                            - compiler/miniReactBundle.ts (bundleKeyboardApp):
                              compiles a whole hand-written keyboard component
                              to plain JS for iOS's mini-runtime (ADR-005) —
                              build-time-only, never exported from index.ts,
                              reachable only via bin/cli.js
  android/                <- Kotlin native module (autolinked automatically)
                            - CustomKeyboardService (extends InputMethodService)
                            - hosts a ReactRootView directly -> renders REAL React Native
                              components at runtime (no compile step needed on Android)
                            - KeyboardBridgeModule: exposes InputConnection methods
                              (commitText, deleteSurroundingText, setSelection, etc.)
                              to JS as a NativeModule
                            - its own AndroidManifest.xml declares the
                              CustomKeyboardService <service> (merges into the
                              consuming app's manifest automatically); its
                              react-native.config.js declares KeyboardSettingsPackage
                              as this dependency's autolinked packageInstance
  ios/                    <- Swift native module + Resources/mini-react-runtime.js
                            - KeyboardViewController (extends UIInputViewController)
                            - embeds a minimal JS runtime: JavaScriptCore (a system
                              framework, not RN/Hermes/Fabric) running a small
                              hand-written prelude + the same hand-written
                              KeyboardApp.tsx Android renders live, compiled to plain
                              JS by this package's own bundleKeyboardApp — see ADR-005
                              below (supersedes ADR-001's original schema-only design)
                            - rendered natively by DynamicViewRenderer, a small
                              View/Text/TouchableOpacity interpreter (not a general
                              layout engine — only what KeyboardApp.tsx uses)
                            - the prelude mirrors most of src/bridge.ts's function
                              names (commitText, getTextBeforeCursor,
                              switchToNextInputMethod, performHapticFeedback, etc.)
                              so the same KeyboardApp.tsx calls identical function
                              names on both platforms; the ones with no
                              UITextDocumentProxy equivalent are still defined as
                              safe no-ops, not left undefined — see docs/api.md's
                              bridge-function parity table
                            - setup_xcode_targets.rb: generalized (no hardcoded
                              project/target names — see ADR-006), creates the
                              consumer's CustomKeyboardExtension Xcode target
  bin/cli.js              <- `npx react-native-custom-keyboard setup-ios` /
                              `build-keyboard` — the only manual steps iOS needs
example/                  <- demo app; also the reference keyboard implementation
docs/
  adr/                     <- architecture decision records — read before changing
                             anything about the iOS rendering strategy, the
                             Android/iOS API surface, or the package layout
```

### ADR-001/ADR-005: iOS's JS runtime is JavaScriptCore + a tiny hand-rolled
### mini-react, never the full RN/Hermes/Fabric stack
ADR-001 originally forbade any live JS runtime in the iOS extension. That was
revisited with the maintainer (as ADR-001 itself required) and superseded by
ADR-005: the extension now embeds `JavaScriptCore` (a system framework —
always present, no extra binary size) running a small hand-written prelude
(`packages/react-native/ios/Resources/mini-react-runtime.js`) plus
`KeyboardApp.tsx` compiled to plain JS (this package's own `bundleKeyboardApp`).
This is *not* a
green light to go further and embed full React Native (Hermes + JSI +
Fabric) — that reintroduces exactly the memory/binary-size/cold-start risk
ADR-001 flagged, for no benefit (JSI's value is bridge-free host calls, which
`JSContext`/`JSValue` already give for free since there's no bridge to cross
here). Any proposal to go further than the ADR-005 mini-runtime still needs
the maintainer's explicit sign-off first, same as ADR-001 required.

### ADR-002: Android renders RN live
Android's `InputMethodService` has a much larger memory budget, and
`ReactRootView` can be safely hosted inside it. Android should use the real RN
runtime, not the compiled-schema interpreter, unless a maintainer decides to
unify the two paths later for consistency.

## 3. Coding Conventions

- TypeScript strict mode everywhere in `packages/react-native/src` and
  `example/`. No `any` without a `// TODO(reason)` comment.
- Kotlin: follow standard Android Kotlin style guide; one class per file;
  `CustomKeyboardService` must never do heavy work on the main/UI thread.
- Swift: follow Swift API Design Guidelines; keep `DynamicViewRenderer` free
  of business logic — it only maps the JS-produced element tree to views.
- All public library APIs (anything exported from
  `packages/react-native/src/index.ts`) must have TSDoc comments and an entry
  in `docs/api.md`.
- Never introduce a new native dependency (CocoaPod, Gradle package) without
  flagging it clearly in the PR/commit description — extension size and memory
  budget are constrained resources.
- `bin/cli.js` and anything under `src/compiler/` must never be reachable
  from `src/index.ts` (see ADR-005/ADR-006) — Metro must never see
  `@babel/core` transitively.

## 4. Testing Requirements

- `packages/react-native`: unit tests (Jest) for `bundleKeyboardApp` and
  layout logic. Every new key-layout feature needs a snapshot test.
- `android/`: instrumented test that boots `CustomKeyboardService` in a test
  harness and asserts `ReactRootView` mounts without throwing. Any change to
  `android/src/main/AndroidManifest.xml` or `react-native.config.js` should be
  verified with a clean `./gradlew :app:assembleDebug` from `example/android`
  and inspecting the merged manifest/generated `PackageList` — don't assume
  Gradle's autolinking cache reflects a change without clearing it (`rm -rf
  build app/build .gradle` if in doubt).
- `ios/`: `miniReactBundle.test.ts` covers the compiler (compiled bundle in ->
  actually executed against a fake mini-runtime -> expected element tree
  out). XCTest coverage for `DynamicViewRenderer`/`JSKeyboardRuntime`
  themselves is a known gap (see ADR-005's "Consequences") — add it before
  relying on either for anything beyond what `example/src/keyboard/
  KeyboardApp.tsx` already exercises. Do not attempt to write iOS extension
  UI tests that require a real keyboard to be enabled in Settings — that
  cannot be automated reliably. Any change to `setup_xcode_targets.rb` should
  be re-verified by running it (via `bin/cli.js setup-ios`) against
  `example/ios` and confirming a clean `xcodebuild` afterwards — it must stay
  free of anything hardcoded to `example`'s own project/target names.
- Do not mark a task complete if you have not run the relevant test suite.

## 5. What NOT to do

- Do not silently change the iOS rendering strategy (ADR-001) to "just embed
  RN" to make a feature easier — raise it as a question instead.
- Do not add telemetry/analytics that phones home from inside the keyboard
  extension without explicit, separate maintainer approval — keyboards can see
  everything the user types, so privacy here is not optional.
- Do not commit example API keys, dictionaries, or word-prediction datasets
  with unclear licensing.
- Do not restructure `packages/` folder layout (or split the single published
  package back apart) without updating this file and adding an ADR in the
  same commit.

## 6. Definition of Done for a PR

1. Builds on both Android and iOS example apps.
2. New/changed public API documented in `docs/api.md`.
3. Tests added/updated and passing.
4. If it touches the compiler, either native module, or the CLI, a short
   note added to `docs/adr/` if it's a meaningful architectural choice.
5. Linted (`yarn lint`) with no new warnings.

## 7. Contact / Escalation

If a task is ambiguous — especially anything touching the iOS memory strategy,
InputConnection edge cases, or privacy-sensitive logging — stop and ask the
maintainer rather than guessing.
