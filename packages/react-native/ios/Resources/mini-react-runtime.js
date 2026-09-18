// The iOS mini-runtime prelude (see docs/adr/ADR-005). Evaluated once, before the compiled
// KeyboardApp bundle (produced by this package's own `bundleKeyboardApp`), inside a bare
// JSContext — there is no real React, ReactDOM, or React Native JS here, just enough of a
// hooks + element-tree API to run a hand-written `View`/`Text`/`TouchableOpacity` component.
//
// All `__native*` identifiers are native functions injected by `JSKeyboardRuntime.swift` before
// this file is evaluated.
//
// This file also mirrors `packages/react-native/src/bridge.ts`'s function names, so the *same*
// hand-written `KeyboardApp.tsx` can call e.g. `commitText`/`getTextBeforeCursor` on both
// platforms. Not every Android bridge function has an iOS equivalent — `UITextDocumentProxy`
// (the only text-editing API a keyboard extension gets on iOS) is a much smaller surface than
// Android's `InputConnection`. Functions with a real iOS implementation are marked below; the
// rest are defined as safe no-ops (resolving a safe default when they return a value) — the same
// convention `packages/react-native/src/bridge.ts` itself follows when its native module isn't
// available, so a cross-platform `KeyboardApp.tsx` never needs to guard for it. Each one is
// commented Android-only right where it's defined; see docs/api.md's bridge-function parity
// table for the full list and the reasoning per function.

// -- Host "components" the compiled JSX pragma (`__h`) resolves tag identifiers to. Plain
// string tags are all `DynamicViewRenderer.swift` needs to know what to render. --
var View = 'View';
var Text = 'Text';
var TouchableOpacity = 'TouchableOpacity';

var StyleSheet = {
  // No style-sheet registry needed (no cross-process serialization here, unlike real RN) —
  // the object the developer wrote is exactly what the native renderer reads.
  create: function (styles) {
    return styles;
  },
};

function commitText(text) {
  __nativeCommitText(text);
}

function deleteSurroundingText(before, after) {
  __nativeDeleteSurroundingText(before, after);
}

/** Resolves the up-to-`length` characters immediately before the cursor, via
 * `textDocumentProxy.documentContextBeforeInput`. Wrapped in a resolved Promise purely so
 * `KeyboardApp.tsx` can `await` it the same way it does for Android's real (cross-process) async
 * native module call — here it's already synchronous. */
function getTextBeforeCursor(length) {
  return Promise.resolve(__nativeGetTextBeforeCursor(length));
}

/** Resolves the up-to-`length` characters immediately after the cursor, via
 * `textDocumentProxy.documentContextAfterInput`. See `getTextBeforeCursor` re: the Promise wrap. */
function getTextAfterCursor(length) {
  return Promise.resolve(__nativeGetTextAfterCursor(length));
}

/** Resolves the currently selected text, via `textDocumentProxy.selectedText`. */
function getSelectedText() {
  return Promise.resolve(__nativeGetSelectedText());
}

/** For a "globe" key. iOS has no distinct previous/next input-method concept for a keyboard
 * extension to trigger — both directions map to the same `advanceToNextInputMode()` call
 * (Apple's own cycle-to-next-enabled-keyboard API). */
function switchToPreviousInputMethod() {
  __nativeSwitchInputMethod();
}

/** See `switchToPreviousInputMethod` — same native call, iOS has only one direction. */
function switchToNextInputMethod() {
  __nativeSwitchInputMethod();
}

/** Fires the system key-tap haptic via `UIImpactFeedbackGenerator`. Requires the user to have
 * granted this keyboard extension "Allow Full Access" in Settings — without it, iOS silently
 * no-ops haptics for extensions (an Apple-imposed restriction, not a bug here). */
function performHapticFeedback() {
  __nativePerformHapticFeedback();
}

/** Plays the system input-click sound via `UIDevice.playInputClick()`. Unlike Android's
 * `AudioManager`, iOS has only one input-click sound — there's no per-key-type variant, so
 * `effect` is accepted for call-site compatibility with Android but otherwise ignored. */
function playClickSound(effect) {
  __nativePlayClickSound();
}

/** Approximates Android's `TextUtils.getCapsMode` by inspecting the text immediately before the
 * cursor (`documentContextBeforeInput`) — CHARACTERS is always satisfied when requested; WORDS is
 * satisfied at the very start or right after whitespace; SENTENCES is satisfied at the very start
 * or right after sentence-ending punctuation. This is a heuristic over visible context, not an
 * identical port of Android's (locale-aware) algorithm. */
function getCursorCapsMode(reqModes) {
  return Promise.resolve(
    __nativeGetCursorCapsMode(reqModes === undefined ? CapsModeRequest.SENTENCES : reqModes),
  );
}

// -- Android only: no iOS UITextDocumentProxy/UIInputViewController equivalent exists for any of
// these (see docs/api.md's bridge-function parity table for why, function by function). Defined
// as safe no-ops — not left undefined — matching how packages/react-native/src/bridge.ts itself
// behaves outside the Android IME process. --

/** Android only — no absolute-offset selection API on iOS (`UITextDocumentProxy` only supports
 * moving the cursor relative to itself). */
function setSelection(start, end) {}

/** Android only — iOS has no `ExtractedText`-shaped API for a keyboard extension. */
function getExtractedText() {
  return Promise.resolve(null);
}

/** Android only — iOS exposes no key-event-injection API to keyboard extensions. */
function sendKeyEvent(keyCode) {}

/** Android only — iOS exposes no generic "perform editor action" API to keyboard extensions. */
function performEditorAction(actionCode) {}

/** Android only — iOS's `UITextDocumentProxy` has no marked/composing-text API for keyboard
 * extensions (only the host app's own `UITextInput` has one). */
function setComposingText(text, newCursorPosition) {}

/** Android only — see `setComposingText`. */
function setComposingRegion(start, end) {}

/** Android only — see `setComposingText`. */
function finishComposingText() {}

/** Android only — iOS has no batch-edit concept for a keyboard extension. */
function beginBatchEdit() {}

/** Android only — see `beginBatchEdit`. */
function endBatchEdit() {}

/** Android only — iOS has no `EditorInfo`-shaped descriptor for a keyboard extension (only the
 * narrower `UITextInputTraits` properties on `textDocumentProxy`). */
function getCurrentEditorInfo() {
  return Promise.resolve(null);
}

/** Android only — the mini-runtime has no event-emitter mechanism and no `EditorInfo` descriptor
 * to emit. Returns a working unsubscribe function that just never fires, same as the Android
 * bridge does outside the IME process. */
function onEditorInfoChange(listener) {
  return function () {};
}

/** Android only — see `onEditorInfoChange`. */
function onSelectionChange(listener) {
  return function () {};
}

/** Android only — iOS gives third-party keyboard extensions no API to dismiss themselves. */
function hideKeyboard() {}

// -- Constants (mirrors packages/react-native/src/bridge.ts) -------------------------------
var KeyEventCodes = {
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
};

var EditorActions = {
  UNSPECIFIED: 0,
  NONE: 1,
  GO: 2,
  SEARCH: 3,
  SEND: 4,
  NEXT: 5,
  DONE: 6,
  PREVIOUS: 7,
};

var CapsModeRequest = {
  CHARACTERS: 1 << 0,
  WORDS: 1 << 1,
  SENTENCES: 1 << 2,
};

var SoundEffect = {
  STANDARD: 'standard',
  SPACEBAR: 'spacebar',
  DELETE: 'delete',
  RETURN: 'return',
  INVALID: 'invalid',
};

// -- Minimal hooks + element tree -----------------------------------------------------------
//
// Only one component instance ever exists (the keyboard's own root), so hook state can live in
// simple module-level arrays indexed by call order within a render — the same rule real React's
// hooks follow (hooks must be called unconditionally, in the same order, every render), without
// needing fibers/multiple-component bookkeeping.

var __hookStates = [];
var __hookIndex = 0;
var __rootComponent = null;
var __rendering = false;

function useState(initialValue) {
  var index = __hookIndex++;
  if (__hookStates.length <= index) {
    __hookStates.push(typeof initialValue === 'function' ? initialValue() : initialValue);
  }
  function setState(next) {
    var previous = __hookStates[index];
    var value = typeof next === 'function' ? next(previous) : next;
    if (value !== previous) {
      __hookStates[index] = value;
      __scheduleRender();
    }
  }
  return [__hookStates[index], setState];
}

function __flattenChildren(children, out) {
  out = out || [];
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child === null || child === undefined || child === true || child === false) continue;
    if (Array.isArray(child)) {
      __flattenChildren(child, out);
    } else {
      out.push(child);
    }
  }
  return out;
}

/** The compiled bundle's JSX pragma target — `<View style={s}>{a}{b}</View>` becomes
 * `__h(View, { style: s }, a, b)`. */
function __h(type, props) {
  var children = __flattenChildren(Array.prototype.slice.call(arguments, 2));
  return { type: type, props: props || {}, children: children };
}

function __mount(componentFn) {
  __rootComponent = componentFn;
  __render();
}

function __render() {
  if (!__rootComponent) return;
  __rendering = true;
  __hookIndex = 0;
  var tree = __rootComponent();
  __rendering = false;
  __nativeRender(tree);
}

function __scheduleRender() {
  // A keyboard's element tree is tiny (a few dozen nodes) — synchronously re-running the whole
  // component and handing the native side a fresh tree on every state change is simple and fast
  // enough; no batching/async scheduling needed.
  __render();
}
