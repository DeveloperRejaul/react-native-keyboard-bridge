package com.customkeyboard.example

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      // KeyboardSettingsModule runs here (the app's own ReactHost), not inside the IME — see
      // docs/api.md's "Native modules > Android" section. It's added automatically by
      // autolinking's generated PackageList — no manual `add(...)` needed — because
      // react-native-keyboard-bridge's react-native.config.js declares it as this dependency's
      // `packageInstance`. KeyboardBridgePackage (the IME-only one) is deliberately NOT
      // autolinked onto this ReactHost; CustomKeyboardService builds its own separate one.
      packageList = PackageList(this).packages,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
