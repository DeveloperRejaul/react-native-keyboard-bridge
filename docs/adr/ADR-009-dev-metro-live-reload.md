# ADR-009: Metro live reload for `KeyboardApp.tsx` during development

## Status
Accepted (maintainer sign-off obtained in-conversation, per AGENTS.md's requirement to raise any
change to the iOS extension's network/bundle-loading behavior as a question first).

## Context
Since ADR-008, both platforms load a **committed** JS bundle (`main.jsbundle` on iOS,
`index.android.bundle` on Android) rather than connecting to Metro — deliberately, to avoid
requiring the keyboard extension to have network access (iOS's "Allow Full Access") just for
routine development. The consequence: editing `example/src/keyboard/KeyboardApp.tsx` never showed
up live — every change needed a manual `bin/cli.js build-keyboard` rebundle plus a full reinstall,
with no Fast Refresh. The maintainer asked for a real-time dev loop on both platforms.

Investigating actual behavior found the two platforms were not symmetric:
- **Android already had this built in and unused.** `CustomKeyboardService.kt` passes
  `useDevSupport = BuildConfig.DEBUG` and `allowPackagerServerAccess = true` to `ReactHostImpl`.
  Reading `ReactHostImpl.kt`'s `jsBundleLoader`/`isMetroRunning`/`loadJSBundleFromMetro` confirmed:
  whenever both flags are true, `ReactHostImpl` *already* pings the packager on every surface
  creation and transparently swaps in a Metro-fetched bundle instead of the committed asset one —
  this is core upstream RN behavior, not something this library had to add. It silently wasn't
  working before only because the dev workflow never had Metro running + `adb reverse tcp:8081
  tcp:8081` set up for the example app.
- **iOS had no equivalent** — `RNKeyboardBootstrap.swift`'s `bundleURL()` hardcoded the committed
  `main.jsbundle` unconditionally, even in DEBUG. Unlike Android's `ReactHostImpl`, iOS's
  `RCTReactNativeFactory` has no automatic "check if Metro is up" fallback; the standard RN iOS
  app template handles this with an explicit `#if DEBUG` branch in `AppDelegate`, which this
  extension never had.

## Decision
1. **Android: no code change.** Document the dev workflow instead — run
   `npx react-native start` from `example/`, run `adb reverse tcp:8081 tcp:8081` (or use
   `react-native run-android`, which does this automatically), and build/install the **debug**
   variant. `ReactHostImpl`'s existing Metro-detection does the rest, including real Fast Refresh
   on save, with zero library code involved.
2. **iOS: `RNKeyboardBootstrap.swift`'s `bundleURL()` now branches on build configuration** —
   `#if DEBUG` returns `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")`
   (a Metro URL, matching the standard RN app template exactly); `#else` keeps the committed
   `main.jsbundle` path from ADR-008, unchanged. RELEASE builds are completely unaffected.
3. **New consumer-facing requirement for iOS development only**: a DEBUG keyboard extension needs
   network access to reach Metro, which iOS extensions don't have by default. Two manual toggles,
   both reversible and both scoped to the developer's own machine/simulator:
   - The extension's `Info.plist` needs `NSExtension > NSExtensionAttributes >
     RequestsOpenAccess` set to `true` (default scaffold from `setup_xcode_targets.rb` is
     `false`, unchanged — this file is hand-maintained like the Podfile, so flip it manually).
   - Once installed, the keyboard needs "Allow Full Access" toggled on in Settings (iOS will only
     show this toggle at all once `RequestsOpenAccess` is `true`).
   Both should be flipped back to `false`/off before shipping to production — `RequestsOpenAccess:
   true` is a real, user-visible permission request that has no reason to ship to end users of a
   keyboard that has no other need for network access.

## Consequences
- If Metro isn't running when a DEBUG build launches, iOS has no fallback to the committed bundle
  (matching standard RN app behavior exactly — a debug app with no packager just fails to load).
  Unlike a normal app, the extension process has no `UIWindow` to present a RedBox in, so this
  failure may be silent from the UI's perspective; check Console.app logs for "Could not connect
  to development server" if the keyboard doesn't render in DEBUG.
- This is a DEBUG-only behavior change — RELEASE builds on both platforms are byte-for-byte
  unaffected by this ADR, so it carries none of ADR-008's production memory/size risk.
- `setup_xcode_targets.rb`'s scaffolded `Info.plist` default (`RequestsOpenAccess: false`) is
  intentionally left unchanged — this ADR does not want every consumer to ship Full Access by
  default; it's a manual, documented, reversible opt-in for development only.
