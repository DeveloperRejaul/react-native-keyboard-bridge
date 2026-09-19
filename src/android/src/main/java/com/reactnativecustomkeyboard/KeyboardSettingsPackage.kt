package com.reactnativecustomkeyboard

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers [KeyboardSettingsModule] with the host app's own ReactHost — add this to
 * `MainApplication`'s `PackageList` (see example/android/app's `MainApplication.kt`). */
class KeyboardSettingsPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(KeyboardSettingsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
      emptyList()
}
