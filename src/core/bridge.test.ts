import { NativeModules } from 'react-native';
import {
  CapsModeRequest,
  EditorActions,
  KeyEventCodes,
  SoundEffect,
  beginBatchEdit,
  commitText,
  deleteSurroundingText,
  endBatchEdit,
  finishComposingText,
  getCurrentEditorInfo,
  getCursorCapsMode,
  getExtractedText,
  getSelectedText,
  getTextAfterCursor,
  getTextBeforeCursor,
  hideKeyboard,
  onEditorInfoChange,
  onSelectionChange,
  performEditorAction,
  performHapticFeedback,
  playClickSound,
  sendKeyEvent,
  setComposingRegion,
  setComposingText,
  setSelection,
  switchToNextInputMethod,
  switchToPreviousInputMethod,
} from './bridge';

describe('bridge', () => {
  const native = NativeModules.KeyboardBridge as Record<string, jest.Mock>;

  beforeEach(() => {
    Object.values(native).forEach((fn) => fn.mockClear());
  });

  it('forwards commitText to the native module', () => {
    commitText('hello');
    expect(native.commitText).toHaveBeenCalledWith('hello');
  });

  it('forwards deleteSurroundingText to the native module', () => {
    deleteSurroundingText(1, 2);
    expect(native.deleteSurroundingText).toHaveBeenCalledWith(1, 2);
  });

  it('forwards setSelection to the native module', () => {
    setSelection(0, 5);
    expect(native.setSelection).toHaveBeenCalledWith(0, 5);
  });

  it('forwards getTextBeforeCursor to the native module and returns its result', async () => {
    native.getTextBeforeCursor.mockResolvedValue('abc');
    await expect(getTextBeforeCursor(3)).resolves.toBe('abc');
    expect(native.getTextBeforeCursor).toHaveBeenCalledWith(3);
  });

  it('forwards getTextAfterCursor to the native module and returns its result', async () => {
    native.getTextAfterCursor.mockResolvedValue('xyz');
    await expect(getTextAfterCursor(3)).resolves.toBe('xyz');
    expect(native.getTextAfterCursor).toHaveBeenCalledWith(3);
  });

  it('forwards getSelectedText to the native module and returns its result', async () => {
    native.getSelectedText.mockResolvedValue('selected');
    await expect(getSelectedText()).resolves.toBe('selected');
  });

  it('forwards getExtractedText to the native module and returns its result', async () => {
    const extracted = { text: 'hello world', selectionStart: 5, selectionEnd: 5, startOffset: 0 };
    native.getExtractedText.mockResolvedValue(extracted);
    await expect(getExtractedText()).resolves.toEqual(extracted);
  });

  it('forwards sendKeyEvent to the native module', () => {
    sendKeyEvent(KeyEventCodes.ENTER);
    expect(native.sendKeyEvent).toHaveBeenCalledWith(66);
  });

  it('forwards performEditorAction to the native module', () => {
    performEditorAction(EditorActions.SEARCH);
    expect(native.performEditorAction).toHaveBeenCalledWith(3);
  });

  it('forwards getCursorCapsMode to the native module and returns its result, defaulting reqModes to SENTENCES', async () => {
    native.getCursorCapsMode.mockResolvedValue(CapsModeRequest.SENTENCES);
    await expect(getCursorCapsMode()).resolves.toBe(CapsModeRequest.SENTENCES);
    expect(native.getCursorCapsMode).toHaveBeenCalledWith(CapsModeRequest.SENTENCES);
  });

  it('forwards setComposingText to the native module, defaulting newCursorPosition to 1', () => {
    setComposingText('hel');
    expect(native.setComposingText).toHaveBeenCalledWith('hel', 1);
  });

  it('forwards setComposingRegion to the native module', () => {
    setComposingRegion(0, 3);
    expect(native.setComposingRegion).toHaveBeenCalledWith(0, 3);
  });

  it('forwards finishComposingText to the native module', () => {
    finishComposingText();
    expect(native.finishComposingText).toHaveBeenCalled();
  });

  it('forwards beginBatchEdit/endBatchEdit to the native module', () => {
    beginBatchEdit();
    endBatchEdit();
    expect(native.beginBatchEdit).toHaveBeenCalled();
    expect(native.endBatchEdit).toHaveBeenCalled();
  });

  it('forwards switchToPreviousInputMethod to the native module', () => {
    switchToPreviousInputMethod();
    expect(native.switchToPreviousInputMethod).toHaveBeenCalled();
  });

  it('forwards switchToNextInputMethod to the native module', () => {
    switchToNextInputMethod();
    expect(native.switchToNextInputMethod).toHaveBeenCalled();
  });

  it('forwards hideKeyboard to the native module', () => {
    hideKeyboard();
    expect(native.hideKeyboard).toHaveBeenCalled();
  });

  it('forwards getCurrentEditorInfo to the native module and returns its result', async () => {
    const info = { inputType: 1, imeOptions: 6, isNumber: false } as never;
    native.getCurrentEditorInfo.mockResolvedValue(info);
    await expect(getCurrentEditorInfo()).resolves.toEqual(info);
  });

  it('forwards performHapticFeedback to the native module', () => {
    performHapticFeedback();
    expect(native.performHapticFeedback).toHaveBeenCalled();
  });

  it('forwards playClickSound to the native module, defaulting effect to STANDARD', () => {
    playClickSound();
    expect(native.playClickSound).toHaveBeenCalledWith(SoundEffect.STANDARD);
  });

  it('subscribes/unsubscribes onEditorInfoChange via addListener/remove', () => {
    const listener = jest.fn();
    const unsubscribe = onEditorInfoChange(listener);
    expect(native.addListener).toHaveBeenCalledWith('onEditorInfoChanged');
    unsubscribe();
    expect(native.removeListeners).toHaveBeenCalledWith(1);
  });

  it('subscribes/unsubscribes onSelectionChange via addListener/remove', () => {
    const listener = jest.fn();
    const unsubscribe = onSelectionChange(listener);
    expect(native.addListener).toHaveBeenCalledWith('onSelectionChanged');
    unsubscribe();
    expect(native.removeListeners).toHaveBeenCalledWith(1);
  });
});
