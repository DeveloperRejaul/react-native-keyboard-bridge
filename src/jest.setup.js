const { NativeModules } = require('react-native');

// Simulates the native `KeyboardBridge` module this package's android/ registers —
// see docs/api.md's "Runtime key-press dispatch" section.
NativeModules.KeyboardBridge = {
  commitText: jest.fn(),
  deleteSurroundingText: jest.fn(),
  setSelection: jest.fn(),
  getTextBeforeCursor: jest.fn(),
  getTextAfterCursor: jest.fn(),
  getSelectedText: jest.fn(),
  getExtractedText: jest.fn(),
  sendKeyEvent: jest.fn(),
  performEditorAction: jest.fn(),
  getCursorCapsMode: jest.fn(),
  setComposingText: jest.fn(),
  setComposingRegion: jest.fn(),
  finishComposingText: jest.fn(),
  beginBatchEdit: jest.fn(),
  endBatchEdit: jest.fn(),
  switchToPreviousInputMethod: jest.fn(),
  switchToNextInputMethod: jest.fn(),
  hideKeyboard: jest.fn(),
  getCurrentEditorInfo: jest.fn(),
  performHapticFeedback: jest.fn(),
  playClickSound: jest.fn(),
  // Required by RN's `NativeEventEmitter` — see `onEditorInfoChange`/`onSelectionChange` in bridge.ts.
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

// Simulates the native `KeyboardSettings` module this package's android/ registers — see settings.ts.
NativeModules.KeyboardSettings = {
  openInputMethodSettings: jest.fn(),
  showInputMethodPicker: jest.fn(),
  isKeyboardEnabled: jest.fn(),
  isKeyboardSelected: jest.fn(),
};
