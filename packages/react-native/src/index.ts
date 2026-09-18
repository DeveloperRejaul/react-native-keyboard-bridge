export type {
  EditorInfoDescriptor,
  ExtractedText,
  SelectionChangeDescriptor,
} from './bridge';

export {
  // Text editing
  commitText,
  deleteSurroundingText,
  setSelection,
  getTextBeforeCursor,
  getTextAfterCursor,
  getSelectedText,
  getExtractedText,
  sendKeyEvent,
  performEditorAction,
  getCursorCapsMode,
  // Composing text
  setComposingText,
  setComposingRegion,
  finishComposingText,
  // Batch edit
  beginBatchEdit,
  endBatchEdit,
  // IME switching / dismissal
  switchToPreviousInputMethod,
  switchToNextInputMethod,
  hideKeyboard,
  // Editor info
  getCurrentEditorInfo,
  onEditorInfoChange,
  onSelectionChange,
  // Feedback
  performHapticFeedback,
  playClickSound,
  // Constants
  KeyEventCodes,
  EditorActions,
  CapsModeRequest,
  SoundEffect,
} from './bridge';

export {
  openInputMethodSettings,
  showInputMethodPicker,
  isKeyboardEnabled,
  isKeyboardSelected,
} from './settings';

// -- Platform-agnostic pieces (no react-native dependency) — gesture/swipe-typing logic and
// word prediction. Kept in this same package (not a separate one a consumer would need to
// install) so `yarn add react-native-custom-keyboard` is the only install step. --

export type { Key, KeyRow, KeyAction } from './layouts/types';
export type { KeyGeometry } from './layouts/geometry';
export { computeGeometry } from './layouts/geometry';

export type { TouchPoint } from './gestures/swipe';
export { keysAlongPath } from './gestures/swipe';

export type { WordPredictor, SuggestOptions } from './prediction/types';
export { StaticDictionaryPredictor } from './prediction/staticDictionary';

// `bundleKeyboardApp` (./compiler/miniReactBundle) is deliberately NOT re-exported here. It pulls
// in the full @babel/core transform pipeline, which is Node-only and breaks Metro's RN-target
// bundling if any app's JS reaches it transitively (see docs/adr/ADR-005). It's a build-time-only
// tool, reachable only via this package's own `bin/cli.js` (`npx react-native-custom-keyboard
// build-keyboard`) — never import it from RN application code.
