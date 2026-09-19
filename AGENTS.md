# AGENTS.md — react-native-keyboard-bridge

Instructions for any AI coding agent (Claude Code, etc.) working in this repository.
Read this file fully before making changes. Follow it exactly unless the human
maintainer explicitly overrides something in the conversation.

## 1. Project Summary

`react-native-keyboard-bridge` is an open-source React Native library that lets a
developer design a mobile system keyboard (an Android IME / iOS Custom Keyboard
Extension) using ordinary React Native components (JSX, `View`, `Text`,
`TouchableOpacity`, StyleSheet, etc.), instead of writing the keyboard UI natively
in Kotlin/Swift.

The `example/` app in this repo is both a test harness for the library AND a real,
shippable keyboard app that demonstrates the library end to end. Treat it as a
first-class citizen, not a throwaway demo — code quality there matters as much as
in the library itself.

## 2. High-Level Architecture

Everything publishes as ONE npm package, `react-native-keyboard-bridge` (see
ADR-006) — a consumer only ever runs `yarn add react-native-keyboard-bridge`.
Do not re-split it back into multiple packages without a new ADR.

```
src/                      <- the only published package
  core/                   <- pure TypeScript
                            - bridge.ts/settings.ts: the JS bridge/settings
                              functions — real on BOTH platforms now (ADR-008)
                            - Key/KeyRow data shape, gesture/swipe-typing
                              logic, word-prediction interfaces
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
  ios/                    <- Swift native module
                            - KeyboardViewController (extends UIInputViewController)
                            - RNKeyboardBootstrap: boots real React Native (Hermes +
                              JSI + Fabric, via RCTReactNativeFactory/RCTRootViewFactory)
                              and requests the same "KeyboardApp" surface Android's
                              ReactHost renders — see ADR-008 (supersedes ADR-005's
                              JavaScriptCore mini-runtime, itself supersedes ADR-001/
                              ADR-004's schema-only design)
                            - KeyboardBridgeModule.swift/.m: the iOS counterpart to
                              android/'s KeyboardBridgeModule.kt, registered as
                              NativeModules.KeyboardBridge (auto-registers via
                              Objective-C runtime scanning — no package list needed)
                            - setup_xcode_targets.rb: generalized (no hardcoded
                              project/target names — see ADR-006), creates the
                              consumer's CustomKeyboardExtension Xcode target
  bin/cli.js              <- `npx react-native-keyboard-bridge setup-ios` /
                              `build-keyboard` — the only manual steps iOS needs
example/                  <- demo app; also the reference keyboard implementation
docs/
  adr/                     <- architecture decision records — read before changing
                             anything about the iOS rendering strategy, the
                             Android/iOS API surface, or the package layout
```

### ADR-010: flattened `packages/react-native/` to `src/`
The repo used to nest the only published package under `packages/react-native/` (a
multi-package-workspace shape left over from before ADR-006 consolidated everything into one
package). Since there's only ever been one package since ADR-006, that nesting added two folder
levels for no reason. `packages/react-native/` is now just `src/` at the repo root, and its inner
pure-TypeScript folder (formerly `packages/react-native/src/`) is `src/core/` — freeing up `src/`
itself to mean "the published package" (matching `android/`, `ios/`, `bin/` as its siblings) rather
than colliding with the TypeScript source folder's usual name. Purely a rename — no behavior
change; see ADR-010 for the full file-by-file mapping.

### ADR-009: Metro live reload in DEBUG builds
`example/src/keyboard/KeyboardApp.tsx` edits now show up live while developing, on both
platforms — Android needed no code change (`ReactHostImpl`'s built-in Metro detection was already
wired via `useDevSupport`/`allowPackagerServerAccess`, just undocumented); iOS's
`RNKeyboardBootstrap.swift` now branches `bundleURL()` on `#if DEBUG` to point at Metro instead of
the committed bundle. DEBUG-only; RELEASE is unaffected. iOS dev requires manually flipping the
extension's `Info.plist` `RequestsOpenAccess` to `true` plus "Allow Full Access" in Settings —
flip both back before shipping. See ADR-009 for the full reasoning.

### ADR-001/ADR-005/ADR-008: iOS's JS runtime history — now full RN, like Android
ADR-001 originally forbade any live JS runtime in the iOS extension over Apple's
extension memory ceiling. ADR-005 revisited that (as ADR-001 required) and embedded a
small hand-rolled JavaScriptCore mini-runtime instead of full RN. ADR-008 revisited
*that* (same maintainer-sign-off process) after an explicit experiment (ADR-007)
showed full React Native (Hermes + JSI + Fabric) actually works inside the extension
process in Simulator testing — no crash, real rendering, real committed text. iOS now
runs the *same* New Architecture stack Android does. **The one risk this doesn't
close**: real device memory behavior under Apple's actual (Simulator does not enforce
it) extension memory ceiling is still unverified — test on a real device before
relying on this for a production ship. Any further architecture change here still
needs the maintainer's explicit sign-off, same as before.

### ADR-002: Android renders RN live
Android's `InputMethodService` has a much larger memory budget, and
`ReactRootView` can be safely hosted inside it — this was always true, and is
no longer the point of platform divergence it once was now that iOS also runs
real RN (ADR-008); the remaining difference is `ReactHost`/`ReactRootView`
(Android) vs. `RCTReactNativeFactory`/`RCTRootViewFactory` (iOS) — different
native-module registration/surface-hosting APIs per platform, not a
capability gap.

## 3. Coding Conventions

- TypeScript strict mode everywhere in `src/core` and
  `example/`. No `any` without a `// TODO(reason)` comment.
- Kotlin: follow standard Android Kotlin style guide; one class per file;
  `CustomKeyboardService` must never do heavy work on the main/UI thread.
- Swift: follow Swift API Design Guidelines; one class per file;
  `KeyboardBridgeModule` reaches the active keyboard only via
  `KeyboardViewController.current` (a bridge module has no view of its own).
- All public library APIs (anything exported from
  `src/core/index.ts`) must have TSDoc comments and an entry
  in `docs/api.md`.
- Never introduce a new native dependency (CocoaPod, Gradle package) without
  flagging it clearly in the PR/commit description — extension size and memory
  budget are constrained resources, especially on iOS post-ADR-008 (real RN is
  meaningfully larger than the old mini-runtime — see ADR-008's "Consequences").

## 4. Testing Requirements

- `src/core`: unit tests (Jest) for layout/gesture/prediction
  logic. Every new key-layout feature needs a snapshot test.
- `android/`: instrumented test that boots `CustomKeyboardService` in a test
  harness and asserts `ReactRootView` mounts without throwing. Any change to
  `android/src/main/AndroidManifest.xml` or `react-native.config.js` should be
  verified with a clean `./gradlew :app:assembleDebug` from `example/android`
  and inspecting the merged manifest/generated `PackageList` — don't assume
  Gradle's autolinking cache reflects a change without clearing it (`rm -rf
  build app/build .gradle` if in doubt).
- `ios/`: XCTest coverage for `RNKeyboardBootstrap`/`KeyboardBridgeModule` is a
  known gap (see ADR-008's "Consequences") — add it before relying on either
  for anything beyond what `example/src/keyboard/KeyboardApp.tsx` already
  exercises. Any change to `setup_xcode_targets.rb` should be re-verified by
  running it (via `bin/cli.js setup-ios`) against `example/ios` and confirming
  a clean `xcodebuild` afterwards — it must stay free of anything hardcoded to
  `example`'s own project/target names. Since ADR-008, the extension's own
  Podfile target also needs a `use_react_native!` block — verify `pod install`
  succeeds there too after any native-side change.
  Real keyboard-extension UI *can* be driven from the command line in a
  sandboxed session with no Accessibility/Input Monitoring permissions —
  confirmed in this session (see ADR-007/ADR-008), contradicting this
  file's own earlier note that it "cannot be automated reliably":
  `xcrun simctl io <udid> screenshot` needs no special permission (plain
  CoreSimulator IPC); a keyboard can be registered by appending to
  `AppleKeyboards` in the simulator's own `.GlobalPreferences.plist`
  (`plutil -insert`) instead of tapping through Settings; `cliclick`
  *does* work against the Simulator window once it's freshly booted and
  frontmost (an earlier failed attempt was most likely stale window
  coordinates, not a hard permission block); `lldb -p <pid> -o "bt all"`
  attaches to a live extension process safely, but `expr`/`po` (compiled
  Objective-C expression evaluation) deadlocked in that same process and
  had to be force-killed — prefer `NSLog` diagnostics you rebuild with
  over live expression evaluation on an extension process. This is real
  but fiddly; still budget for it not working and falling back to static
  verification.
- Do not mark a task complete if you have not run the relevant test suite.

## 5. What NOT to do

- Do not silently change the iOS rendering strategy (ADR-008) — e.g. reverting
  to a compiled subset, or adding native modules beyond what's documented —
  without raising it as a question first.
- Do not add telemetry/analytics that phones home from inside the keyboard
  extension without explicit, separate maintainer approval — keyboards can see
  everything the user types, so privacy here is not optional.
- Do not commit example API keys, dictionaries, or word-prediction datasets
  with unclear licensing.
- Do not restructure the `src/` folder layout (or split the single published
  package back apart) without updating this file and adding an ADR in the
  same commit (see ADR-010).

## 6. Definition of Done for a PR

1. Builds on both Android and iOS example apps.
2. New/changed public API documented in `docs/api.md`.
3. Tests added/updated and passing.
4. If it touches either native module or the CLI, a short note added to
   `docs/adr/` if it's a meaningful architectural choice.
5. Linted (`yarn lint`) with no new warnings.

## 7. Contact / Escalation

If a task is ambiguous — especially anything touching the iOS memory strategy,
InputConnection edge cases, or privacy-sensitive logging — stop and ask the
maintainer rather than guessing.
