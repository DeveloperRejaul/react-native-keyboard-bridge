# ADR-007: Full React Native (Hermes/JSI/Fabric) in the iOS extension — experiment status

## Status
**Experimental / visually confirmed rendering, text input not yet wired — not adopted as the
default.** `KeyboardViewController` defaults back to the ADR-005 mini-runtime
(`useExperimentalFullRN = false`); the full-RN path is fully functional to the extent built, kept
available behind that flag for further work. Update: a real simulator run (via `xcrun simctl` +
directly editing the simulator's preferences plist to register the keyboard, since GUI click
automation was — surprisingly, contradicting this session's earlier assumption — actually
possible via `cliclick` this time once the simulator was freshly booted) got the extension
process to actually launch, **and, after fixing a real bug this same investigation uncovered
(see below and ADR-005), to actually render and accept text input.**

## Context
ADR-001/ADR-005 rejected embedding full React Native in the iOS keyboard extension, citing
Apple's tight extension memory ceiling and RN iOS's historical assumptions about running inside a
full app (`UIApplication`, a `UIWindow`, a main run loop owned by `UIApplicationMain`). The
maintainer explicitly asked, in conversation, to try it anyway as an experiment — that
authorization is the "raise it as a question and get sign-off" AGENTS.md requires before touching
this boundary.

## What was built
- `example/ios/Podfile`: a second `use_react_native!` block for the `CustomKeyboardExtension`
  target (previously RN pods were only in the app target).
- `example/ios/CustomKeyboardExtension/FullRNKeyboardBootstrap.swift` (app-owned, experimental —
  **not** shipped in `packages/react-native/ios/`, the npm package's actual iOS sources): wraps
  `RCTReactNativeFactory` + `RCTAppDependencyProvider`, but calls
  `factory.rootViewFactory.view(withModuleName:)` instead of
  `startReactNative(withModuleName:in:launchOptions:)` — the latter requires a `UIWindow`, which
  doesn't exist in an extension process; the former returns a plain `UIView`, the same shape of
  primitive Android's `ReactHostImpl.createSurface(...)` already gives `CustomKeyboardService.kt`.
- A committed `main.jsbundle` (via `npx react-native bundle --dev false`), loaded directly from
  the extension's own bundle rather than a Metro dev-server URL — sidesteps the fact that
  keyboard extensions have no network access without the user granting "Allow Full Access"
  (`RequestsOpenAccess` in Info.plist), which can't be automated in this environment.
- `packages/react-native/ios/KeyboardViewController.swift`: a temporary `useExperimentalFullRN`
  flag branches `viewDidLoad()` to the new bootstrap instead of `JSKeyboardRuntime`. **This is a
  live edit to the actual library file** — revert it (`useExperimentalFullRN = false`, or remove
  the branch entirely) before treating the library as in its ADR-005 state again.
- `example/ios/add_experimental_full_rn_files.rb`: one-off script wiring the two new files into
  the Xcode project (not part of the generalized `setup_xcode_targets.rb` — this is a spike, not
  a shipped feature).

## What's proven
- `pod install` with RN's New Architecture pods (React-Core, Hermes, Fabric, ReactCommon, etc.)
  targeting an **App Extension** target succeeds — CocoaPods does not refuse this outright.
- A full `xcodebuild` (app + extension) **succeeds** with `FullRNKeyboardBootstrap` compiled in
  and `KeyboardViewController` wired to use it — the `RCTReactNativeFactory`/`RCTRootViewFactory`/
  `RCTAppDependencyProvider` APIs link and type-check correctly against a window-free call path.
- The built `.appex` grew from ~130KB (JavaScriptCore-only) to **3.7MB** (with the ~875KB
  `main.jsbundle` embedded) — a first, concrete data point for the memory/binary-size risk
  ADR-001 flagged, though on-disk size isn't the same as resident memory at runtime.

## What an actual simulator run showed (this session, via `xcrun simctl` + `lldb`, no human interaction)
Contrary to this session's earlier assumption (based on a prior, unrelated attempt with stale
Simulator window coordinates), `cliclick`/`osascript` GUI automation **did** work once the
Simulator was freshly booted and activated. Steps taken, all from the command line:
1. Registered the extension as a keyboard by directly appending to `AppleKeyboards` in the
   simulator's `.GlobalPreferences.plist` (the same array `Settings.app`'s "Enable keyboard"
   toggle writes to) — `"com.customkeyboard.example.CustomKeyboardExtension@Custom;en_US"`.
   Rebooted the simulator so it reloaded prefs.
2. Installed and launched the host app (`xcrun simctl install`/`launch`), took a screenshot
   (`xcrun simctl io screenshot`, no Accessibility permission needed — a plain CoreSimulator IPC
   call, unlike `cliclick`'s CGEvent injection), then `cliclick` on the demo's text field —
   **this worked**: a cursor and the system's keyboard accessory bar (globe + dictation mic)
   appeared. Tapping the globe icon didn't visibly change anything, but see below.
3. `xcrun simctl spawn ... log show --predicate 'process == "CustomKeyboardExtension"'` confirmed
   the extension process **did launch** and logged
   `[CustomKeyboard] EXPERIMENTAL: bootstrapping full RN (Hermes/JSI/Fabric)` — our own code ran.
   No crash, no fatal exception, no entry in `~/Library/Logs/DiagnosticReports` or the simulator's
   `CrashReporter` directory.
4. **`lldb -p <pid> -o "bt all"` attached to the live extension process** (a debugging technique,
   not GUI automation — works over a straightforward `ptrace`-style attach) showed, among the
   expected UIKit/extension threads: a `com.facebook.react.runtime.JavaScript` thread idle in its
   own run loop (steady state, not stuck mid-init), a Hermes `hades` GC thread running normally,
   and a `com.facebook.SocketRocket.NetworkThread` (RN's dev-inspector WebSocket client). This is
   strong evidence **Hermes + the RN JS runtime actually initialized successfully inside the
   keyboard extension process** — the single biggest open question ADR-001/ADR-005 raised.
5. **Visible rendering was initially not confirmed — root cause found and fixed.** Every
   screenshot right after the tap sequence showed only the system's own globe+dictation-mic
   accessory strip, never the demo `KeyboardApp`'s row of keys. Rather than attaching a debugger
   with `expr`/`po` (tried first — `lldb`'s Objective-C expression evaluator **deadlocked**
   calling `[UIApplication sharedApplication] windows]` against the extension's suspended main
   thread; killed after ~15s of runaway CPU, no further live-expression attempts made), diagnostic
   `NSLog` calls were added directly to `KeyboardViewController.swift` logging the rendered view's
   frame at +0.3s/+1.0s/+2.5s/+5.0s. This is the finding: **`frame={{4, 4}, {385, 0}}` — height
   exactly 0, unchanged across all four delays.** Root cause: `KeyboardViewController`'s `view`
   itself never had an explicit height constraint (a `UIInputViewController`'s view has none by
   default), so the four-edge-pinned constraints on the rendered subtree still resolved a valid
   width but zero height. Fixing this (`setUpKeyboardHeight()`, a required 216pt height
   constraint on `view` in `viewDidLoad` — see ADR-005, since this bug applies to *both* rendering
   paths, not just this experiment) **immediately produced a real, correctly-styled QWERTY
   keyboard render** in the Simulator screenshot.
6. **Text input was tested and confirmed working — for the ADR-005 mini-runtime path, not yet for
   this full-RN experiment.** After the height fix, `useExperimentalFullRN` was flipped back to
   `false` (the production default) to check whether the *shipping* code path was affected by the
   same bug — it was, and fixing it made real typed characters (`fhhjjgg`, from taps landing on
   keys during coordinate calibration) actually appear in the host app's text field, proving
   `textDocumentProxy.insertText` end-to-end for the first time with real GUI confirmation. The
   full-RN experimental path itself was confirmed to *render* correctly (`useExperimentalFullRN =
   true`, screenshot showed the full keyboard) but a deliberate key tap produced **no text
   commit** — expected, not a bug: `FullRNKeyboardBootstrap` never registered any native module
   equivalent to `KeyboardBridgeModule`, so `NativeModules.KeyboardBridge` is `undefined` in that
   path and `commitText`/`deleteSurroundingText` are safe no-ops, exactly per their documented
   fallback behavior (see docs/api.md).

## Remaining unknowns (full-RN path specifically)
- **No native text-editing bridge exists for this path yet.** To make the full-RN experiment
  actually usable as a keyboard, it needs a real Objective-C/Swift native module exposing
  `textDocumentProxy` operations to JS — the equivalent of `KeyboardBridgeModule.kt` — registered
  with `FullRNKeyboardBootstrap`'s `RCTHost`/turbo module system. Not yet attempted.
- Whether RN iOS's internals ever call `UIApplication.shared` (an extension-forbidden API) is
  still unconfirmed either way — nothing observed ruled it out, but nothing crashed on it either
  across several minutes of interaction in this run. A longer-running session exercising more
  code paths (dev menu, reload, etc.) might still hit one.
- Real resident memory under iOS's actual (device-enforced, not Simulator-enforced — the
  Simulator does **not** faithfully reproduce the extension memory ceiling) memory limit is still
  unmeasured; this result was obtained entirely in Simulator, which is known to be far more
  lenient about extension sandboxing (network access to Metro's dev server worked here too, which
  would very likely fail on a real device without "Allow Full Access").

## Next step
Either: (a) wire a real native text-editing module for the full-RN path so it's actually usable,
then compare its behavior/perf side-by-side with the mini-runtime, or (b) test on a **real
device** — the only way to get a trustworthy answer on the memory-ceiling question ADR-001
originally raised, since Simulator doesn't enforce it.

## If it's rejected
Revert `KeyboardViewController.swift`'s `useExperimentalFullRN` flag and the branch it guards,
remove `FullRNKeyboardBootstrap.swift`/`main.jsbundle`/the Podfile's second `use_react_native!`
block/`add_experimental_full_rn_files.rb`, and re-run `example/ios`'s `pod install` to drop the
extension-target RN pods. `KeyboardViewController` falls back to `loadRuntime()`'s existing
ADR-005 mini-runtime path unchanged underneath this flag.
