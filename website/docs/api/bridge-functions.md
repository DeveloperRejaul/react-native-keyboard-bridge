---
sidebar_position: 2
---

# Bridge functions

Plain functions wrapping the native `KeyboardBridge` module directly, no object/class to
instantiate:

```tsx showLineNumbers
import { commitText } from 'react-native-keyboard-bridge';
<TouchableOpacity onPress={() => commitText('a')}><Text>a</Text></TouchableOpacity>
```

```ts showLineNumbers
function commitText(text: string): void;
function deleteSurroundingText(before: number, after: number): void;
function setSelection(start: number, end: number): void;
function getTextBeforeCursor(length: number): Promise<string>;
function getTextAfterCursor(length: number): Promise<string>;
function getSelectedText(): Promise<string>;
function sendKeyEvent(keyCode: number): void;
function performEditorAction(actionCode: number): void;
function switchToPreviousInputMethod(): void;
function hideKeyboard(): void;
function getCursorCapsMode(reqModes?: number): Promise<number>; // defaults to CapsModeRequest.SENTENCES
```

`bridge.ts` runs on **both** platforms: Android's `CustomKeyboardService` and iOS's
`KeyboardViewController` both host real React Native and both register a native module named
`KeyboardBridge`. Outside either IME/extension process every function here is a safe no-op instead
of throwing, so a component that calls them doesn't need to guard for it.

## Bridge-function parity table

`UITextDocumentProxy`/`UIInputViewController` (the only API surface a keyboard extension gets on
iOS) is a much smaller surface than Android's `InputConnection`, so parity isn't 1:1. Functions
with no iOS implementation are still defined in the iOS native module, as **safe no-ops**
(resolving a safe default when they return a value) — not left `undefined` — so a shared
`KeyboardApp.tsx` never needs to guard for it.

| Function | iOS | Notes |
|---|---|---|
| `commitText` | ✅ | `textDocumentProxy.insertText` |
| `deleteSurroundingText` | ⚠️ partial | `before` via repeated `deleteBackward()`; `after` silently ignored (no forward-delete API) |
| `getTextBeforeCursor` | ✅ | `textDocumentProxy.documentContextBeforeInput` |
| `getTextAfterCursor` | ✅ | `textDocumentProxy.documentContextAfterInput` |
| `getSelectedText` | ✅ | `textDocumentProxy.selectedText` |
| `getCursorCapsMode` | ⚠️ approximated | heuristic over `documentContextBeforeInput`, not Android's exact locale-aware algorithm |
| `switchToNextInputMethod` | ✅ | `UIInputViewController.advanceToNextInputMode()` |
| `switchToPreviousInputMethod` | ⚠️ approximated | iOS has no distinct "previous" — calls the same `advanceToNextInputMode()` |
| `performHapticFeedback` | ✅* | `UIImpactFeedbackGenerator`; *silently no-ops without user-granted "Allow Full Access" (Apple restriction) |
| `playClickSound` | ⚠️ partial | `UIDevice.playInputClick()`; `effect` argument accepted but ignored (iOS has one click sound, not per-key-type) |
| `setSelection` | ❌ | no absolute-offset selection API |
| `getExtractedText` | ❌ | no `ExtractedText`-shaped API |
| `sendKeyEvent` | ❌ | no key-event-injection API |
| `performEditorAction` | ❌ | no generic "perform action" API |
| `setComposingText` / `setComposingRegion` / `finishComposingText` | ❌ | no marked/composing-text API for extensions |
| `beginBatchEdit` / `endBatchEdit` | ❌ | no batch-edit concept |
| `getCurrentEditorInfo` / `onEditorInfoChange` / `onSelectionChange` | ❌ | no `EditorInfo` descriptor or event-emitter mechanism wired up on the iOS side |
| `hideKeyboard` | ❌ | no self-dismiss API for third-party keyboard extensions |

❌ rows are Android only; the iOS native module's same-named method is a silent no-op (or resolves
a safe default, e.g. `null`/`''`, for value-returning ones).

`sendKeyEvent`/`performEditorAction` cover the cases `commitText`/`deleteSurroundingText` don't:
some editors (search boxes, single-line forms) respond to a real hardware-style key event or their
own IME action instead of inserted text. `switchToPreviousInputMethod`/`hideKeyboard` back a
"globe"/"hide keyboard" key. `getCursorCapsMode` lets a keyboard auto-capitalize the next letter
the way system keyboards do.

Three constant maps are exported alongside these, so callers don't have to remember Android's raw
integer codes:

```ts showLineNumbers
const KeyEventCodes: { ENTER, DEL, TAB, SPACE, ESCAPE, FORWARD_DEL, DPAD_LEFT, DPAD_RIGHT, DPAD_UP, DPAD_DOWN };
const EditorActions: { UNSPECIFIED, NONE, GO, SEARCH, SEND, NEXT, DONE, PREVIOUS };
const CapsModeRequest: { CHARACTERS, WORDS, SENTENCES };
```

## Settings functions

Run from the *host app's own* screen (e.g. an onboarding step in `App.tsx`), not from inside the
keyboard — enabling/switching a keyboard is something only the app the user already has open can
prompt them to do.

```ts showLineNumbers
function openInputMethodSettings(): void;
function showInputMethodPicker(): void;
function isKeyboardEnabled(): Promise<boolean>;
function isKeyboardSelected(): Promise<boolean>;
```

`openInputMethodSettings` works on both platforms: Android opens system Settings'
keyboard-management screen directly; iOS can only open this app's own Settings page (Apple exposes
no deeper deep link), from which the user still navigates to General > Keyboard > Keyboards
themselves. `showInputMethodPicker`/`isKeyboardEnabled`/`isKeyboardSelected` are Android only — iOS
has no API for a containing app to do either, so these resolve a safe default (`false`/no-op)
there instead of throwing.
