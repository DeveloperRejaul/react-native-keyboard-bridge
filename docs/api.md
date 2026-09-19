# `react-native-keyboard-bridge` API Reference

Public API surface exported from `src/core/index.ts` — the
single published package (see ADR-006). Keep this file in sync with that
entry point (AGENTS.md Section 3).

There is no `KeyLayout`/schema type and no ready-to-use keyboard component in
this library — a keyboard is a hand-written `View`/`Text`/`TouchableOpacity`
component you write yourself, the same file running live on **both** Android
and iOS now (real React Native, Hermes + JSI + Fabric — see ADR-008). Beyond
the bridge/settings functions below, this package also supplies: the `Key`/
`KeyRow` data shape used by the gesture-matching feature, word prediction,
and iOS's setup CLI.

## `Key` / `KeyRow` / `KeyAction`
```ts
interface Key {
  id: string;             // unique within the row, e.g. "q", "shift"
  label: string;          // rendered text
  width: number;          // multiples of one standard key
  action: KeyAction;
  value?: string;         // committed text for insertChar/commitText; falls back to label
  secondaryLabel?: string;
}

interface KeyRow {
  keys: Key[];
}

type KeyAction =
  | 'insertChar' | 'commitText' | 'deleteBackward'
  | 'toggleShift' | 'toggleSymbols' | 'switchLanguage' | 'space' | 'enter';
```
This is data modeling for the gesture-matching feature below (`keysAlongPath`
returns `Key[]`) — it isn't rendered by anything and doesn't restrict script
or language: `label`/`value` are plain Unicode strings, so a `Key` can
represent any language/script (Arabic, Devanagari, CJK, Cyrillic, Bangla,
etc.) the same way.

## Geometry

### `computeGeometry(rows, rowHeight = 1): KeyGeometry[]`
Lays out a set of rows on a grid (row-major, left-to-right) in "standard key"
units. Pure/deterministic. Used by the gesture matcher below.
```ts
interface KeyGeometry { key: Key; x0: number; x1: number; y0: number; y1: number; }
```

## Gestures

### `keysAlongPath(rows, path, rowHeight = 1): Key[]`
Given a set of rows and a raw touch path (`TouchPoint[]`, same units as
geometry), returns the ordered, de-duplicated sequence of keys the path
passed over. Points outside every key are ignored. Pure function — no I/O.
```ts
interface TouchPoint { x: number; y: number; }
```

## Word prediction

### `WordPredictor` (interface)
```ts
interface WordPredictor {
  suggest(prefix: string, options?: SuggestOptions): string[];
}
interface SuggestOptions { limit?: number; } // default 3
```
Pluggable — apps may supply frequency-weighted or ML-backed implementations.

### `StaticDictionaryPredictor`
Minimal `WordPredictor` backed by an in-memory word list. Case-insensitive
prefix match, ranked shortest-then-alphabetical.

## `react-native-keyboard-bridge`

The React Native package: raw bridge functions for a hand-written keyboard
component to call directly from its own `onPress` handlers — no schema, no
ready-made component, no requirement to use anything below beyond what you
call.

### Raw bridge functions
Plain functions wrapping the native `KeyboardBridge` module directly, no
object/class to instantiate:
```tsx
import { commitText } from 'react-native-keyboard-bridge';
<TouchableOpacity onPress={() => commitText('a')}><Text>a</Text></TouchableOpacity>
```
```ts
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
This file (`bridge.ts`) runs on **both** platforms now (see ADR-008): Android's
`CustomKeyboardService` and iOS's `KeyboardViewController` both host real React Native and both
register a native module named `KeyboardBridge` (`android/`'s `KeyboardBridgeModule.kt` and
`ios/`'s `KeyboardBridgeModule.swift`). Outside either IME/extension process every function here
is a safe no-op instead of throwing, so a component that calls them doesn't need to guard for it.

### Bridge-function parity table
`UITextDocumentProxy`/`UIInputViewController` (the only API surface a keyboard extension gets on
iOS) is a much smaller surface than Android's `InputConnection`, so parity isn't 1:1. Functions
with no iOS implementation are still defined in the iOS native module, as **safe no-ops**
(resolving a safe default when they return a value) — not left `undefined` — the same convention
`src/core/bridge.ts` itself already follows when its native module isn't
available, so a shared `KeyboardApp.tsx` never needs to guard for it.

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

❌ rows are Android only; the iOS native module's same-named method is a silent no-op (or
resolves a safe default, e.g. `null`/`''`, for value-returning ones).

`sendKeyEvent`/`performEditorAction` cover the cases `commitText`/
`deleteSurroundingText` don't: some editors (search boxes, single-line forms)
respond to a real hardware-style key event or their own IME action instead of
inserted text. `switchToPreviousInputMethod`/`hideKeyboard` back a
"globe"/"hide keyboard" key. `getCursorCapsMode` lets a keyboard
auto-capitalize the next letter the way system keyboards do.

Three constant maps are exported alongside these, so callers don't have to
remember Android's raw integer codes:
```ts
const KeyEventCodes: { ENTER, DEL, TAB, SPACE, ESCAPE, FORWARD_DEL, DPAD_LEFT, DPAD_RIGHT, DPAD_UP, DPAD_DOWN };
const EditorActions: { UNSPECIFIED, NONE, GO, SEARCH, SEND, NEXT, DONE, PREVIOUS };
const CapsModeRequest: { CHARACTERS, WORDS, SENTENCES };
```

### `openInputMethodSettings` / `showInputMethodPicker` / `isKeyboardEnabled` / `isKeyboardSelected`
Run from the *host app's own* screen (e.g. an onboarding step in `App.tsx`),
not from inside the keyboard — enabling/switching a keyboard is something
only the app the user already has open can prompt them to do.
```ts
function openInputMethodSettings(): void;
function showInputMethodPicker(): void;
function isKeyboardEnabled(): Promise<boolean>;
function isKeyboardSelected(): Promise<boolean>;
```
`openInputMethodSettings` works on both platforms: Android opens system
Settings' keyboard-management screen directly; iOS can only open this app's
own Settings page (Apple exposes no deeper deep link), from which the user
still navigates to General > Keyboard > Keyboards themselves.
`showInputMethodPicker`/`isKeyboardEnabled`/`isKeyboardSelected` are Android
only — iOS has no API for a containing app to do either, so these resolve a
safe default (`false`/no-op) there instead of throwing.

## Native modules

### Android (`src/android`)
`CustomKeyboardService` hosts its own standalone `ReactHost` (New
Architecture, Fabric) inside the `InputMethodService` — see ADR-003.
`KeyboardBridgeModule` exposes all of the raw bridge functions above to JS as
`NativeModules.KeyboardBridge` — see the JS wrappers above.
`KeyboardSettingsModule.kt` (registered on the *host app's* own ReactHost,
not the IME's) exposes `openInputMethodSettings`/`showInputMethodPicker`/
`isKeyboardEnabled`/`isKeyboardSelected`. Autolinked automatically as this
dependency's `packageInstance` (see `react-native.config.js` and ADR-006) —
no manual registration in the consuming app's `MainApplication`.
`CustomKeyboardService`'s own `<service>` declaration lives in this module's
own `AndroidManifest.xml` and merges into the consuming app's manifest
automatically (Gradle manifest merging); the consuming app still supplies its
own `res/xml/method.xml`/`keyboard_service_label` (keyboard branding/subtypes
are app-specific, not library defaults).

### iOS (`src/ios`)
`KeyboardViewController` boots real React Native — `RNKeyboardBootstrap`
wraps `RCTReactNativeFactory`/`RCTAppDependencyProvider` and requests a
`"KeyboardApp"` surface via `RCTRootViewFactory.view(withModuleName:)` (no
`UIWindow` needed, unlike the factory's usual `startReactNative` entry point
— extensions don't have one). See ADR-008 (supersedes ADR-005's
JavaScriptCore mini-runtime, itself supersedes ADR-001/ADR-004).
`KeyboardBridgeModule.swift`/`.m` is the iOS counterpart to `android/`'s
`KeyboardBridgeModule.kt` — registered as `NativeModules.KeyboardBridge`
automatically (Objective-C runtime class scanning, no package list needed),
reaching the active keyboard's `textDocumentProxy` via
`KeyboardViewController.current` (a `static weak var`, since a bridge module
has no view of its own) — see the parity table above for exactly which
bridge functions this covers. `performHapticFeedback` uses
`UIImpactFeedbackGenerator`; `playClickSound` uses `UIDevice.playInputClick()`
(`KeyboardViewController` conforms to `UIInputViewAudioFeedback` for this to
work, per Apple's own custom-keyboard guidance).

`KeyboardSettingsModule.swift`/`.m` (registered on the *host app's* own
ReactHost, not the extension's) exposes `openInputMethodSettings` — opens
this app's own Settings page, the closest iOS allows a containing app to get
to enabling its keyboard extension.

### CLI (`bin/cli.js`)
Installed as the `react-native-keyboard-bridge` binary — run via
`npx react-native-keyboard-bridge <command>` from your app's root, or (in
this repo) `node src/bin/cli.js <command>`.

- **`setup-ios [iosDir]`** (default `iosDir`: `./ios`) — creates or refreshes
  the `CustomKeyboardExtension` Xcode target, wired to this package's Swift
  sources; scaffolds a starter `Info.plist`/`main.jsbundle` under
  `<iosDir>/CustomKeyboardExtension/` if missing, and prints a Podfile
  snippet to add if the extension target has no `use_react_native!` block
  yet. Idempotent by recreation (see ADR-006) — safe to re-run after updating
  this package. This is the one manual step iOS can't avoid: Apple requires
  a distinct App Extension target, which no CocoaPod/npm install can
  fabricate on its own.
- **`build-keyboard [outFile] [--entry-file <file>] [--dev]`** — wraps the
  standard `react-native bundle` CLI (see ADR-008; no custom compiler of our
  own anymore). Run it (default `outFile`:
  `ios/CustomKeyboardExtension/main.jsbundle`) whenever your JS changes —
  this output is committed, app-owned generated content, not something
  Xcode's build produces itself.

## Not yet implemented
- XCTest coverage for `RNKeyboardBootstrap`/`KeyboardBridgeModule` — see
  ADR-008's "Consequences". Verification so far has been a real Simulator
  run (screenshots + `lldb`/log inspection, see ADR-007), not automated
  tests.
- Real-device memory verification for iOS's now-full-RN extension — see
  ADR-008's "Consequences": Simulator doesn't enforce Apple's actual
  extension memory ceiling.
