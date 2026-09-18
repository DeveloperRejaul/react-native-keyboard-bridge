import { NativeEventEmitter, NativeModules } from 'react-native';

/**
 * The native `KeyboardBridge` module's shape (see this package's `android/`
 * `KeyboardBridgeModule.kt`). Exposed here as plain functions — no wrapper
 * object required — so a host app can write its own keyboard UI however it
 * wants and just call these directly from its own `onPress` handlers, e.g.:
 *
 * ```tsx
 * import { commitText } from 'react-native-custom-keyboard';
 * <TouchableOpacity onPress={() => commitText('a')}><Text>a</Text></TouchableOpacity>
 * ```
 *
 * This file itself only ever runs on Android: it calls into the native module
 * `CustomKeyboardService` registers, which only exists inside the Android IME process (see
 * ADR-003). Outside that context every function here is a safe no-op instead of throwing
 * (functions returning a value resolve/return a safe default), so components that call them
 * don't need to guard for it themselves. Event subscriptions (`onEditorInfoChange`/
 * `onSelectionChange`) likewise return a working unsubscribe function that just never fires.
 *
 * iOS's keyboard extension never runs this npm package's JS at all (see ADR-005) — it runs
 * this package's own `ios/Resources/mini-react-runtime.js` instead, which independently provides *most* of
 * these same function names as globals for a shared `KeyboardApp.tsx` to call, backed by
 * `UITextDocumentProxy`/`UIInputViewController` instead of this file's `NativeModules.KeyboardBridge`.
 * Each function below is commented **Android + iOS** or **Android only** accordingly — the
 * "iOS" comment describes the mini-runtime's parallel implementation, not this file's, since this
 * file's own code never executes there. See docs/api.md's bridge-function parity table for the
 * full picture in one place.
 */
interface KeyboardBridgeNativeModule {
  commitText(text: string): void;
  deleteSurroundingText(before: number, after: number): void;
  setSelection(start: number, end: number): void;
  getTextBeforeCursor(length: number): Promise<string>;
  getTextAfterCursor(length: number): Promise<string>;
  getSelectedText(): Promise<string>;
  getExtractedText(): Promise<ExtractedText | null>;
  sendKeyEvent(keyCode: number): void;
  performEditorAction(actionCode: number): void;
  getCursorCapsMode(reqModes: number): Promise<number>;
  setComposingText(text: string, newCursorPosition: number): void;
  setComposingRegion(start: number, end: number): void;
  finishComposingText(): void;
  beginBatchEdit(): void;
  endBatchEdit(): void;
  switchToPreviousInputMethod(): void;
  switchToNextInputMethod(): void;
  hideKeyboard(): void;
  getCurrentEditorInfo(): Promise<EditorInfoDescriptor | null>;
  performHapticFeedback(): void;
  playClickSound(effect: string): void;
}

/** The whole field's text plus where the selection sits within it. */
export interface ExtractedText {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  startOffset: number;
}

/**
 * What kind of text field this keyboard is currently attached to — read this (or subscribe via
 * `onEditorInfoChange`) to adapt the rendered layout, e.g. a numeric pad for `isNumber` fields,
 * hiding the return key for single-line fields, or labeling the enter key from `imeAction`.
 * `inputType`/`imeOptions` are the raw Android bitmasks; the `is*`/`imeAction` fields are decoded
 * for convenience.
 */
export interface EditorInfoDescriptor {
  inputType: number;
  imeOptions: number;
  imeAction: number;
  actionId: number;
  fieldId: number;
  packageName: string | null;
  hintText: string | null;
  label: string | null;
  privateImeOptions: string | null;
  isPassword: boolean;
  isNumber: boolean;
  isPhone: boolean;
  isDatetime: boolean;
  isEmail: boolean;
  isUri: boolean;
  isMultiline: boolean;
}

/** A cursor/selection change — including ones from outside this keyboard (e.g. the user tapping
 * elsewhere in the field). */
export interface SelectionChangeDescriptor {
  oldSelStart: number;
  oldSelEnd: number;
  newSelStart: number;
  newSelEnd: number;
}

const native = NativeModules.KeyboardBridge as KeyboardBridgeNativeModule | undefined;
const emitter = native ? new NativeEventEmitter(NativeModules.KeyboardBridge) : null;

// -- Text editing -----------------------------------------------------------------------

/** Commits `text` at the cursor, replacing any current selection.
 *
 * Android + iOS — the mini-runtime's `commitText` calls `textDocumentProxy.insertText` directly. */
export function commitText(text: string): void {
  native?.commitText(text);
}

/** Deletes `before` characters before the cursor and `after` characters after it.
 *
 * Android + iOS (partial) — the mini-runtime's `deleteSurroundingText` handles `before` via
 * repeated `textDocumentProxy.deleteBackward()` calls; `after` is a silent no-op on iOS, which
 * exposes no forward-delete API to keyboard extensions. */
export function deleteSurroundingText(before: number, after: number): void {
  native?.deleteSurroundingText(before, after);
}

/** Moves the selection to the given range.
 *
 * Android only — `UITextDocumentProxy` has no absolute-offset selection API (only
 * `adjustTextPosition(byCharacterOffset:)`, relative to the cursor); the mini-runtime's
 * `setSelection` is a silent no-op on iOS. */
export function setSelection(start: number, end: number): void {
  native?.setSelection(start, end);
}

/** Resolves the up-to-`length` characters immediately before the cursor.
 *
 * Android + iOS — the mini-runtime's `getTextBeforeCursor` reads
 * `textDocumentProxy.documentContextBeforeInput`. */
export function getTextBeforeCursor(length: number): Promise<string> {
  return native?.getTextBeforeCursor(length) ?? Promise.resolve('');
}

/** Resolves the up-to-`length` characters immediately after the cursor.
 *
 * Android + iOS — the mini-runtime's `getTextAfterCursor` reads
 * `textDocumentProxy.documentContextAfterInput`. */
export function getTextAfterCursor(length: number): Promise<string> {
  return native?.getTextAfterCursor(length) ?? Promise.resolve('');
}

/** Resolves the currently selected text, or an empty string when nothing is selected.
 *
 * Android + iOS — the mini-runtime's `getSelectedText` reads `textDocumentProxy.selectedText`. */
export function getSelectedText(): Promise<string> {
  return native?.getSelectedText() ?? Promise.resolve('');
}

/** Resolves the whole field's text and where the selection sits within it.
 *
 * Android only — iOS has no `ExtractedText`-shaped API (no `fieldId`/`packageName`/etc. for a
 * keyboard extension); the mini-runtime's `getExtractedText` resolves `null` on iOS. */
export function getExtractedText(): Promise<ExtractedText | null> {
  return native?.getExtractedText() ?? Promise.resolve(null);
}

/**
 * Dispatches a hardware-style key event, e.g. `sendKeyEvent(KeyEventCodes.ENTER)`. Prefer this
 * over `commitText('\n')` for keys editors treat specially (enter/backspace/tab/arrows).
 *
 * Android only — iOS has no key-event-injection API for keyboard extensions; the mini-runtime's
 * `sendKeyEvent` is a silent no-op on iOS.
 */
export function sendKeyEvent(keyCode: number): void {
  native?.sendKeyEvent(keyCode);
}

/**
 * Triggers the current text field's IME action, e.g. `performEditorAction(EditorActions.SEARCH)`
 * to submit a search box the same way the system keyboard's "search" key does.
 *
 * Android only — iOS exposes no generic "perform editor action" API to keyboard extensions; the
 * mini-runtime's `performEditorAction` is a silent no-op on iOS.
 */
export function performEditorAction(actionCode: number): void {
  native?.performEditorAction(actionCode);
}

/**
 * Resolves the auto-capitalization hint for the text at the cursor (mirrors
 * `TextUtils.getCapsMode`) — use with `CapsModeFlags`/`CapsModeRequest` to decide whether the
 * next committed letter should be capitalized.
 *
 * Android + iOS (approximated) — the mini-runtime's `getCursorCapsMode` computes a heuristic over
 * `textDocumentProxy.documentContextBeforeInput` rather than porting Android's exact (locale-aware)
 * algorithm — see its comment in `mini-react-runtime.js`.
 */
export function getCursorCapsMode(reqModes: number = CapsModeRequest.SENTENCES): Promise<number> {
  return native?.getCursorCapsMode(reqModes) ?? Promise.resolve(0);
}

// -- Composing text (pre-commit preview, for autocorrect/phonetic/CJK-style input) ------

/** Shows `text` at the cursor as an underlined, not-yet-committed "composition" — the same
 * mechanism autocorrect previews and phonetic/CJK input methods use. Replaces any previous
 * composing text. Call `finishComposingText` (or `commitText`, which implicitly finishes it)
 * once the user accepts it.
 *
 * Android only — iOS's `UITextDocumentProxy` exposes no marked/composing-text API to keyboard
 * extensions (only the host app's own `UITextInput` has one); the mini-runtime's
 * `setComposingText` is a silent no-op on iOS. */
export function setComposingText(text: string, newCursorPosition: number = 1): void {
  native?.setComposingText(text, newCursorPosition);
}

/** Marks an already-committed range as the composing region, so a later `setComposingText` call
 * replaces it instead of inserting new text.
 *
 * Android only — see `setComposingText`; the mini-runtime's `setComposingRegion` is a silent
 * no-op on iOS. */
export function setComposingRegion(start: number, end: number): void {
  native?.setComposingRegion(start, end);
}

/** Commits the current composing text as-is (removing its underline) without changing it.
 *
 * Android only — see `setComposingText`; the mini-runtime's `finishComposingText` is a silent
 * no-op on iOS. */
export function finishComposingText(): void {
  native?.finishComposingText();
}

// -- Batch edit ---------------------------------------------------------------------------

/** Groups the edits made until the matching `endBatchEdit` into a single editor update — use
 * around several bridge calls that should be applied together (e.g. an autocorrect replacement:
 * `setComposingRegion` + `commitText`).
 *
 * Android only — iOS has no batch-edit concept for a keyboard extension; the mini-runtime's
 * `beginBatchEdit` is a silent no-op on iOS. */
export function beginBatchEdit(): void {
  native?.beginBatchEdit();
}

/** Android only — see `beginBatchEdit`; the mini-runtime's `endBatchEdit` is a silent no-op on
 * iOS. */
export function endBatchEdit(): void {
  native?.endBatchEdit();
}

// -- IME switching / dismissal ------------------------------------------------------------

/** For a "globe" key: switches to the user's previous enabled input method.
 *
 * Android + iOS (approximated) — iOS has no distinct "previous" direction for a keyboard
 * extension to trigger; the mini-runtime's `switchToPreviousInputMethod` calls the same
 * `advanceToNextInputMode()` as `switchToNextInputMethod` does. */
export function switchToPreviousInputMethod(): void {
  native?.switchToPreviousInputMethod();
}

/** For a "globe" key that cycles forward: switches to the next enabled input method
 * (falls back to the previous one on Android versions before 9/API 28).
 *
 * Android + iOS — the mini-runtime's `switchToNextInputMethod` calls
 * `UIInputViewController.advanceToNextInputMode()`. */
export function switchToNextInputMethod(): void {
  native?.switchToNextInputMethod();
}

/** For a "hide keyboard" key: dismisses this keyboard, same as the system back action.
 *
 * Android only — iOS gives third-party keyboard extensions no API to dismiss themselves (only
 * the globe key/switching to another keyboard, or the user manually); the mini-runtime's
 * `hideKeyboard` is a silent no-op on iOS. */
export function hideKeyboard(): void {
  native?.hideKeyboard();
}

// -- Editor info ----------------------------------------------------------------------------

/** Reads the current field's `EditorInfo` on demand — the pull-based counterpart to
 * `onEditorInfoChange`, useful right after mounting (before the next field-focus event fires).
 *
 * Android only — iOS has no `EditorInfo`-shaped descriptor for a keyboard extension (only the
 * narrower `UITextInputTraits` properties on `textDocumentProxy`); the mini-runtime's
 * `getCurrentEditorInfo` resolves `null` on iOS. */
export function getCurrentEditorInfo(): Promise<EditorInfoDescriptor | null> {
  return native?.getCurrentEditorInfo() ?? Promise.resolve(null);
}

/** Fires whenever the keyboard attaches to a (possibly new) text field. Returns an unsubscribe
 * function.
 *
 * Android only — the mini-runtime has no event-emitter mechanism and no `EditorInfo` descriptor
 * to emit (see `getCurrentEditorInfo`); its `onEditorInfoChange` returns a working unsubscribe
 * function that just never fires, same as this file's own behavior outside the IME process. */
export function onEditorInfoChange(listener: (info: EditorInfoDescriptor) => void): () => void {
  if (!emitter) return () => {};
  const subscription = emitter.addListener('onEditorInfoChanged', (info: unknown) =>
    listener(info as EditorInfoDescriptor),
  );
  return () => subscription.remove();
}

/** Fires whenever the cursor/selection changes, including from outside this keyboard (e.g. the
 * user tapping elsewhere in the field). Returns an unsubscribe function.
 *
 * Android only — see `onEditorInfoChange`. */
export function onSelectionChange(listener: (selection: SelectionChangeDescriptor) => void): () => void {
  if (!emitter) return () => {};
  const subscription = emitter.addListener('onSelectionChanged', (selection: unknown) =>
    listener(selection as SelectionChangeDescriptor),
  );
  return () => subscription.remove();
}

// -- Feedback (haptic/sound) ----------------------------------------------------------------

/** Fires the system's standard key-tap haptic (same as Gboard/system keyboards on key press).
 *
 * Android + iOS — the mini-runtime's `performHapticFeedback` calls `UIImpactFeedbackGenerator`.
 * On iOS this silently no-ops unless the user has granted the keyboard extension "Allow Full
 * Access" (an Apple-imposed restriction on keyboard extensions, not a bug here). */
export function performHapticFeedback(): void {
  native?.performHapticFeedback();
}

/** Plays a system key-click sound effect. Silent no-op unless the user has key-click sounds
 * enabled — the same behavior every system keyboard follows.
 *
 * Android + iOS (partial) — the mini-runtime's `playClickSound` calls
 * `UIDevice.playInputClick()`, iOS's one-and-only input-click sound; `effect` is accepted for
 * call-site compatibility but ignored there (Android's per-key-type sounds have no iOS
 * equivalent). */
export function playClickSound(effect: string = SoundEffect.STANDARD): void {
  native?.playClickSound(effect);
}

// -- Constants --------------------------------------------------------------------------

/**
 * Common `KeyEvent` key codes for `sendKeyEvent` — the subset a keyboard typically needs.
 * (Full list: `android.view.KeyEvent`.)
 */
export const KeyEventCodes = {
  ENTER: 66,
  DEL: 67,
  TAB: 61,
  SPACE: 62,
  ESCAPE: 111,
  FORWARD_DEL: 112,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_UP: 19,
  DPAD_DOWN: 20,
} as const;

/**
 * `EditorInfo.IME_ACTION_*` values for `performEditorAction`/`EditorInfoDescriptor.imeAction` —
 * what a text field asked the keyboard's "enter" key to do (e.g. a search box sets `SEARCH`, a
 * single-line form field often sets `NEXT`).
 */
export const EditorActions = {
  UNSPECIFIED: 0,
  NONE: 1,
  GO: 2,
  SEARCH: 3,
  SEND: 4,
  NEXT: 5,
  DONE: 6,
  PREVIOUS: 7,
} as const;

/** `reqModes` flags for `getCursorCapsMode` — mirrors `android.text.TextUtils.CAP_MODE_*`. */
export const CapsModeRequest = {
  CHARACTERS: 1 << 0,
  WORDS: 1 << 1,
  SENTENCES: 1 << 2,
} as const;

/** Effect names for `playClickSound` — mirrors `android.media.AudioManager.FX_KEYPRESS_*`. */
export const SoundEffect = {
  STANDARD: 'standard',
  SPACEBAR: 'spacebar',
  DELETE: 'delete',
  RETURN: 'return',
  INVALID: 'invalid',
} as const;
