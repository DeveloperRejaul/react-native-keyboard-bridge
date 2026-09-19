---
slug: android-ime-architecture
title: "How Does an Android IME Work? Hosting React Native Inside InputMethodService"
description: "A deep dive into how react-native-keyboard-bridge hosts a real, standalone React Native ReactHost inside an Android InputMethodService — no classic bridge, no Activity required."
keywords: [android ime architecture, inputmethodservice react native, android custom keyboard architecture, reacthost android, how does android ime work]
authors: [rejaul]
tags: [android, architecture, react-native]
---

Android's `InputMethodService` has a much larger memory budget than iOS's extension model, which
is exactly why the Android side of this library could go straight to "host real React Native" with
none of the multi-generation caution iOS needed.

{/* truncate */}

## Why not the classic bridge?

The obvious first approach — `ReactInstanceManager`, the classic (pre-New-Architecture) bridge —
turned out to be a dead end: current React Native versions unconditionally throw when you try to
construct one outside of an `Activity`-hosted flow. An `InputMethodService` is not an `Activity`.

The validated replacement is `ReactHostImpl` + `ReactSurface` — bridgeless, New Architecture,
Fabric — and critically, `com.facebook.react.runtime.ReactSurfaceView` is a plain `View` with no
`Activity` dependency, confirmed by reading the framework source directly rather than assuming.

## The shape of it

```kotlin showLineNumbers
class CustomKeyboardService : InputMethodService(), DefaultHardwareBackBtnHandler {
  private var reactHost: ReactHost? = null

  override fun onCreate() {
    super.onCreate()
    reactHost = buildReactHost().also { it.start() }
  }

  override fun onCreateInputView(): View {
    val surface = reactHost!!.createSurface(this, "KeyboardApp", Bundle())
    surface.start()
    return surface.view ?: View(this)
  }
}
```

`buildReactHost()` wires a `DefaultReactHostDelegate` with `KeyboardBridgeModule` (the native
counterpart to the JS bridge functions) in its package list, and a Hermes `JSRuntimeFactory`. The
IME owns its own `ReactHost` — not a shared one with the containing app — so its lifecycle
(`onStartInputView`/`onFinishInputView`) maps directly onto `ReactHost.onHostResume`/
`onHostPause`.

## Zero manual Android wiring, on purpose

Two real integration bugs got fixed while building this, not just moved around:

1. `CustomKeyboardService`'s `<service>` declaration lives in the *library's own*
   `AndroidManifest.xml`, using the `${applicationId}.MainActivity` Gradle placeholder — it merges
   into your app's manifest automatically. No manual manifest edit.
2. `KeyboardSettingsModule` (the host-app-facing native module — `openInputMethodSettings` and
   friends) is declared as this dependency's autolinked `packageInstance` in
   `react-native.config.js`. No manual `MainApplication.kt` edit.

Autolinking only supports one auto-instantiated package per dependency, which is exactly why the
IME-only `KeyboardBridgeModule` is *not* autolinked the same way — `CustomKeyboardService`
constructs its own standalone `ReactHost` directly, and the host app's own `ReactHost` should never
see it. Two native modules, two very different registration paths, by design.

The only things Android still asks you to supply are the two resources that are legitimately
app-specific: `res/xml/method.xml` (your keyboard's language subtypes) and
`res/values/strings.xml`'s `keyboard_service_label` — every app names its own keyboard.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

