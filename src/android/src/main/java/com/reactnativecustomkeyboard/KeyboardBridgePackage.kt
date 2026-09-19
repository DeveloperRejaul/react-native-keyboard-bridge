package com.reactnativecustomkeyboard

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers [KeyboardBridgeModule] with the [CustomKeyboardService]'s own ReactInstanceManager. */
class KeyboardBridgePackage(private val service: CustomKeyboardService) : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(KeyboardBridgeModule(reactContext, service))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
      emptyList()
}
