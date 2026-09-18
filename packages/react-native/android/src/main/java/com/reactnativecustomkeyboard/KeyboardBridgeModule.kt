package com.reactnativecustomkeyboard

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.text.InputType
import android.view.HapticFeedbackConstants
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.ExtractedTextRequest
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Exposes [android.view.inputmethod.InputConnection] and [android.inputmethodservice.InputMethodService]
 * methods to JS as a NativeModule, wired to whichever [CustomKeyboardService] instance currently
 * owns the input connection. See docs/api.md for the JS-facing `KeyboardBridge` API.
 */
class KeyboardBridgeModule(
    reactContext: ReactApplicationContext,
    private val service: CustomKeyboardService,
) : ReactContextBaseJavaModule(reactContext) {

  init {
    service.editorInfoListener = { info -> emit("onEditorInfoChanged", editorInfoToMap(info)) }
    service.selectionListener = { oldStart, oldEnd, newStart, newEnd ->
      val map = Arguments.createMap()
      map.putInt("oldSelStart", oldStart)
      map.putInt("oldSelEnd", oldEnd)
      map.putInt("newSelStart", newStart)
      map.putInt("newSelEnd", newEnd)
      emit("onSelectionChanged", map)
    }
  }

  override fun getName() = "KeyboardBridge"

  private fun emit(eventName: String, params: WritableMap) {
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
  }

  /** Required by RN's `NativeEventEmitter` on the JS side; events are pushed unconditionally, so
   * there is nothing to start/stop per-listener-count here. */
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  // -- Text editing (InputConnection) -----------------------------------------------------

  @ReactMethod
  fun commitText(text: String) {
    service.currentInputConnection?.commitText(text, 1)
  }

  @ReactMethod
  fun deleteSurroundingText(before: Int, after: Int) {
    service.currentInputConnection?.deleteSurroundingText(before, after)
  }

  @ReactMethod
  fun setSelection(start: Int, end: Int) {
    service.currentInputConnection?.setSelection(start, end)
  }

  @ReactMethod
  fun getTextBeforeCursor(length: Int, promise: Promise) {
    val text = service.currentInputConnection?.getTextBeforeCursor(length, 0)
    promise.resolve(text?.toString() ?: "")
  }

  @ReactMethod
  fun getTextAfterCursor(length: Int, promise: Promise) {
    val text = service.currentInputConnection?.getTextAfterCursor(length, 0)
    promise.resolve(text?.toString() ?: "")
  }

  @ReactMethod
  fun getSelectedText(promise: Promise) {
    val text = service.currentInputConnection?.getSelectedText(0)
    promise.resolve(text?.toString() ?: "")
  }

  /** The whole field's text plus where the selection sits within it — for state a keyboard
   * can't derive from just the text immediately around the cursor. */
  @ReactMethod
  fun getExtractedText(promise: Promise) {
    val extracted = service.currentInputConnection?.getExtractedText(ExtractedTextRequest(), 0)
    if (extracted == null) {
      promise.resolve(null)
      return
    }
    val map = Arguments.createMap()
    map.putString("text", extracted.text?.toString() ?: "")
    map.putInt("selectionStart", extracted.selectionStart)
    map.putInt("selectionEnd", extracted.selectionEnd)
    map.putInt("startOffset", extracted.startOffset)
    promise.resolve(map)
  }

  /** Dispatches a hardware-style key event (see `KeyEventCodes` in the JS package), e.g. enter/backspace/tab. */
  @ReactMethod
  fun sendKeyEvent(keyCode: Int) {
    val connection = service.currentInputConnection ?: return
    val now = System.currentTimeMillis()
    connection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, keyCode, 0))
    connection.sendKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, keyCode, 0))
  }

  /** Triggers the current editor's IME action (see `EditorActions` in the JS package), e.g. search/go/done. */
  @ReactMethod
  fun performEditorAction(actionCode: Int) {
    service.currentInputConnection?.performEditorAction(actionCode)
  }

  /** Auto-capitalization hint for the field at the cursor; mirrors `TextUtils.getCapsMode`. */
  @ReactMethod
  fun getCursorCapsMode(reqModes: Int, promise: Promise) {
    val mode = service.currentInputConnection?.getCursorCapsMode(reqModes) ?: 0
    promise.resolve(mode)
  }

  // -- Composing text (pre-commit preview, for autocorrect/phonetic/CJK-style input) -------

  @ReactMethod
  fun setComposingText(text: String, newCursorPosition: Int) {
    service.currentInputConnection?.setComposingText(text, newCursorPosition)
  }

  @ReactMethod
  fun setComposingRegion(start: Int, end: Int) {
    service.currentInputConnection?.setComposingRegion(start, end)
  }

  @ReactMethod
  fun finishComposingText() {
    service.currentInputConnection?.finishComposingText()
  }

  // -- Batch edit (coalesce multiple InputConnection calls into one editor update) ---------

  @ReactMethod
  fun beginBatchEdit() {
    service.currentInputConnection?.beginBatchEdit()
  }

  @ReactMethod
  fun endBatchEdit() {
    service.currentInputConnection?.endBatchEdit()
  }

  // -- IME switching / dismissal (InputMethodService) --------------------------------------

  /** For a "globe" key: switches to the user's previous enabled input method. */
  @ReactMethod
  fun switchToPreviousInputMethod() {
    service.switchToPreviousInputMethod()
  }

  /** For a "globe" key that cycles forward: switches to the next enabled input method. Falls
   * back to switching to the previous one on API < 28, where this method doesn't exist. */
  @ReactMethod
  fun switchToNextInputMethod() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      service.switchToNextInputMethod(false)
    } else {
      service.switchToPreviousInputMethod()
    }
  }

  /** For a "hide keyboard" key: dismisses this IME the same way the system back action does. */
  @ReactMethod
  fun hideKeyboard() {
    service.requestHideSelf(0)
  }

  // -- Editor info (what kind of field this keyboard is currently attached to) -------------

  /** Pull-based counterpart to the `onEditorInfoChanged` event, for reading it on demand
   * (e.g. right after a listener is attached) rather than only on the next field focus. */
  @ReactMethod
  fun getCurrentEditorInfo(promise: Promise) {
    val info = service.currentInputEditorInfo
    promise.resolve(if (info != null) editorInfoToMap(info) else null)
  }

  private fun editorInfoToMap(info: EditorInfo): WritableMap {
    val inputClass = info.inputType and InputType.TYPE_MASK_CLASS
    val variation = info.inputType and InputType.TYPE_MASK_VARIATION
    val isTextClass = inputClass == InputType.TYPE_CLASS_TEXT
    val isNumberClass = inputClass == InputType.TYPE_CLASS_NUMBER
    val isPassword =
        (isTextClass &&
            (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD)) ||
            (isNumberClass && variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD)

    val map = Arguments.createMap()
    map.putInt("inputType", info.inputType)
    map.putInt("imeOptions", info.imeOptions)
    map.putInt("imeAction", info.imeOptions and EditorInfo.IME_MASK_ACTION)
    map.putInt("actionId", info.actionId)
    map.putInt("fieldId", info.fieldId)
    map.putString("packageName", info.packageName)
    map.putString("hintText", info.hintText?.toString())
    map.putString("label", info.label?.toString())
    map.putString("privateImeOptions", info.privateImeOptions)
    map.putBoolean("isPassword", isPassword)
    map.putBoolean("isNumber", isNumberClass)
    map.putBoolean("isPhone", inputClass == InputType.TYPE_CLASS_PHONE)
    map.putBoolean("isDatetime", inputClass == InputType.TYPE_CLASS_DATETIME)
    map.putBoolean("isEmail", isTextClass && variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
    map.putBoolean("isUri", isTextClass && variation == InputType.TYPE_TEXT_VARIATION_URI)
    map.putBoolean(
        "isMultiline", isTextClass && (info.inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0)
    return map
  }

  // -- Feedback (haptic/sound) --------------------------------------------------------------

  @ReactMethod
  fun performHapticFeedback() {
    service.window?.window?.decorView?.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
  }

  /** `effect` is one of `SoundEffect` in the JS package (`"standard"`, `"spacebar"`, `"delete"`,
   * `"return"`, `"invalid"`); unrecognized values fall back to `"standard"`. */
  @ReactMethod
  fun playClickSound(effect: String) {
    val audioManager = service.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    val soundEffect =
        when (effect) {
          "spacebar" -> AudioManager.FX_KEYPRESS_SPACEBAR
          "delete" -> AudioManager.FX_KEYPRESS_DELETE
          "return" -> AudioManager.FX_KEYPRESS_RETURN
          "invalid" -> AudioManager.FX_KEYPRESS_INVALID
          else -> AudioManager.FX_KEYPRESS_STANDARD
        }
    audioManager?.playSoundEffect(soundEffect)
  }
}
