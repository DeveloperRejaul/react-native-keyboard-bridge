---
slug: live-reload-for-keyboard-extensions
title: "How to Get Live Reload Working in a React Native Keyboard Extension"
description: "Enable Metro Fast Refresh for a React Native custom keyboard on both Android and iOS — no more rebuild-and-reinstall loop every time you change your keyboard component."
keywords: [metro live reload react native, fast refresh keyboard extension, react native ios extension debug, react native android ime debug, react native metro dev server]
authors: [rejaul]
tags: [devex, react-native, metro]
---

Before this, changing a single line in `KeyboardApp.tsx` meant a full rebundle and reinstall on
both platforms — no Fast Refresh, no live reload, just the standard edit-rebuild-reinstall loop
every time. It turns out the fix required two completely different investigations, because
Android and iOS started from opposite places.

{/* truncate */}

## Android already had this — just never wired up

`CustomKeyboardService.kt` already passes `useDevSupport = BuildConfig.DEBUG` and
`allowPackagerServerAccess = true` to `ReactHostImpl`. Reading `ReactHostImpl`'s own source
confirmed something surprising: whenever both flags are true, it *already* pings the packager on
every surface creation and transparently swaps in a Metro-fetched bundle instead of the committed
asset one. This is core upstream React Native behavior — nothing the library needed to add. It
silently wasn't working before only because the dev workflow never had Metro running with `adb
reverse tcp:8081 tcp:8081` set up for the app.

Zero code changes. Just: run `npx react-native start`, run `adb reverse tcp:8081 tcp:8081` (or use
`react-native run-android`, which does it for you), install a debug build, and real Fast Refresh
on save just works.

## iOS needed an actual code change

`RNKeyboardBootstrap.swift`'s `bundleURL()` hardcoded the committed `main.jsbundle` unconditionally
— even in DEBUG builds — because `RCTReactNativeFactory` has no automatic "check if Metro is up"
fallback the way Android's `ReactHostImpl` does. The fix mirrors the standard RN iOS app template
exactly:

```swift showLineNumbers
override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle(for: KeyboardReactNativeDelegate.self).url(forResource: "main", withExtension: "jsbundle")
    #endif
}
```

RELEASE builds are completely unaffected — they still load the committed bundle, unchanged.

## The one new requirement: temporary network access

A DEBUG keyboard extension reaching Metro needs network access, which extensions don't have by
default. Two one-time, reversible toggles:

1. Set `NSExtension > NSExtensionAttributes > RequestsOpenAccess` to `true` in the extension's
   `Info.plist`.
2. Enable "Allow Full Access" for the keyboard in Settings, once it's installed.

Both should flip back to `false`/off before a release build — `RequestsOpenAccess: true` is a
real, user-visible permission request with no reason to ship if your keyboard has no other need
for network access.

If Metro isn't running when a DEBUG build launches, there's no fallback to the committed bundle —
same as any standard debug React Native app. The one difference: an extension process has no
`UIWindow` to present a red error screen in, so the failure can be silent from the UI's
perspective. Check Console.app logs for "Could not connect to development server" if the keyboard
doesn't render.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

