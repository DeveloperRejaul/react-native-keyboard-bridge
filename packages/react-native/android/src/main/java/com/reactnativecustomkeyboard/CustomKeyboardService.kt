package com.reactnativecustomkeyboard

import android.inputmethodservice.InputMethodService
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JSBundleLoader
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.defaults.DefaultComponentsRegistry
import com.facebook.react.defaults.DefaultReactHostDelegate
import com.facebook.react.defaults.DefaultTurboModuleManagerDelegate
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.runtime.ReactHostImpl
import com.facebook.react.runtime.hermes.HermesInstance
import com.facebook.react.shell.MainReactPackage

/**
 * Android IME entry point. Hosts its own standalone New-Architecture [ReactHost] (Fabric,
 * bridgeless) so the keyboard's JSX renders as real React Native inside an [InputMethodService] —
 * a context with no Activity. See docs/adr/ADR-003: the classic bridge (`ReactInstanceManager`),
 * which the original design used, was found to be hard-removed at runtime in current React
 * Native (it now unconditionally throws). [ReactHostImpl] + [ReactSurface] is the validated
 * replacement — [com.facebook.react.runtime.ReactSurfaceView] is a plain `View` with no Activity
 * dependency, confirmed by reading the framework source directly.
 *
 * This class owns rendering/lifecycle only; text editing goes through [KeyboardBridgeModule].
 */
@OptIn(UnstableReactNativeAPI::class, FrameworkAPI::class)
class CustomKeyboardService : InputMethodService(), DefaultHardwareBackBtnHandler {

  companion object {
    private const val KEYBOARD_APP_COMPONENT_NAME = "KeyboardApp"
    private const val JS_BUNDLE_ASSET_URL = "assets://index.android.bundle"
    private const val JS_MAIN_MODULE_PATH = "index"
  }

  private var reactHost: ReactHost? = null
  private var surface: ReactSurface? = null

  /** Set by [KeyboardBridgeModule] so it can forward editor/selection changes to JS as events. */
  var editorInfoListener: ((EditorInfo) -> Unit)? = null
  var selectionListener: ((oldStart: Int, oldEnd: Int, newStart: Int, newEnd: Int) -> Unit)? = null

  override fun onCreate() {
    super.onCreate()
    val host = buildReactHost()
    reactHost = host
    host.start()
  }

  private fun buildReactHost(): ReactHost {
    val bundleLoader = JSBundleLoader.createAssetLoader(applicationContext, JS_BUNDLE_ASSET_URL, true)
    val delegate =
        DefaultReactHostDelegate(
            jsMainModulePath = JS_MAIN_MODULE_PATH,
            jsBundleLoader = bundleLoader,
            reactPackages = listOf<ReactPackage>(MainReactPackage(), KeyboardBridgePackage(this)),
            jsRuntimeFactory = HermesInstance(),
            turboModuleManagerDelegateBuilder = DefaultTurboModuleManagerDelegate.Builder(),
        )
    val componentFactory = ComponentFactory()
    DefaultComponentsRegistry.register(componentFactory)
    return ReactHostImpl(
        applicationContext,
        delegate,
        componentFactory,
        /* allowPackagerServerAccess = */ true,
        /* useDevSupport = */ BuildConfig.DEBUG,
    )
  }

  override fun onCreateInputView(): View {
    val host = reactHost ?: buildReactHost().also { reactHost = it }
    val newSurface = host.createSurface(this, KEYBOARD_APP_COMPONENT_NAME, Bundle())
    surface = newSurface
    newSurface.start()
    return newSurface.view ?: View(this)
  }

  override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
    super.onStartInputView(info, restarting)
    reactHost?.onHostResume(null, this)
    info?.let { editorInfoListener?.invoke(it) }
  }

  override fun onFinishInputView(finishingInput: Boolean) {
    reactHost?.onHostPause(null)
    super.onFinishInputView(finishingInput)
  }

  /** Reports cursor/selection changes — including ones from outside this keyboard (e.g. the
   * user tapping elsewhere in the field) — to JS via [KeyboardBridgeModule]'s selection event. */
  override fun onUpdateSelection(
      oldSelStart: Int,
      oldSelEnd: Int,
      newSelStart: Int,
      newSelEnd: Int,
      candidatesStart: Int,
      candidatesEnd: Int,
  ) {
    super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd)
    selectionListener?.invoke(oldSelStart, oldSelEnd, newSelStart, newSelEnd)
  }

  override fun onDestroy() {
    surface?.detach()
    surface = null
    reactHost?.let {
      it.onHostDestroy(null)
      it.destroy("CustomKeyboardService destroyed", null)
    }
    reactHost = null
    super.onDestroy()
  }

  /** Required by [DefaultHardwareBackBtnHandler]; the IME's own back handling stays default. */
  override fun invokeDefaultOnBackPressed() {
    // No-op: InputMethodService already dismisses the keyboard on back press by default.
  }
}
