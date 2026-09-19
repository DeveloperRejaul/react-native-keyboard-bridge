package com.reactnativecustomkeyboard

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Runs in the *host app's own* ReactHost (registered via `MainApplication`'s `PackageList`) —
 * unlike [KeyboardBridgeModule], which only exists inside [CustomKeyboardService]'s isolated
 * IME process. Lets a host app build its own "Enable keyboard"/"Switch keyboard" onboarding UI
 * instead of just telling the user to find it in system settings themselves.
 */
class KeyboardSettingsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "KeyboardSettings"

  private fun componentName() =
      ComponentName(reactApplicationContext, CustomKeyboardService::class.java).flattenToShortString()

  /** Opens system Settings > Languages & input > On-screen keyboard, where the user turns this
   * keyboard's toggle on (required once, the same way Gboard/any 3rd-party keyboard is enabled —
   * an app cannot enable an IME for the user, only link to where they do it themselves). */
  @ReactMethod
  fun openInputMethodSettings() {
    val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  /** Opens the system's "choose input method" chooser (the same dialog long-pressing the
   * space bar/globe key opens) so the user can switch to this keyboard — only works once it's
   * already enabled via [openInputMethodSettings]. */
  @ReactMethod
  fun showInputMethodPicker() {
    val imm =
        reactApplicationContext.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.showInputMethodPicker()
  }

  /** Resolves whether this keyboard is turned on in system settings (not necessarily the one
   * currently typing with — see [isKeyboardSelected]). Use this to decide whether an onboarding
   * screen should still show an "Enable keyboard" step.
   *
   * Deliberately uses [InputMethodManager.getEnabledInputMethodList] rather than reading the
   * `enabled_input_methods` `Settings.Secure` key directly — Android 14+ (targetSdk 34+) makes
   * that key a "restricted setting", throwing a `SecurityException` for apps targeting it. This
   * public API reads the same information without that restriction. */
  @ReactMethod
  fun isKeyboardEnabled(promise: Promise) {
    val imm =
        reactApplicationContext.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    val isEnabled =
        imm?.enabledInputMethodList?.any { it.component.flattenToShortString() == componentName() }
            ?: false
    promise.resolve(isEnabled)
  }

  /** Resolves whether this keyboard is the user's *currently active* default input method.
   * `default_input_method` isn't (currently) one of Android's restricted settings keys, but this
   * still resolves `false` instead of rejecting if a future OS version restricts it too. */
  @ReactMethod
  fun isKeyboardSelected(promise: Promise) {
    val selected =
        try {
          Settings.Secure.getString(
              reactApplicationContext.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } catch (e: SecurityException) {
          null
        }
    promise.resolve(selected == componentName())
  }
}
