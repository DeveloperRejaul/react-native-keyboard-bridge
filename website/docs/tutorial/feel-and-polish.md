---
sidebar_position: 5
title: "5. Native Feel: Haptics, Sound, Auto-Caps"
---

# Native Feel: Haptics, Sound, Auto-Caps

A keyboard that only commits the right characters still feels wrong without the small physical
feedback details system keyboards have trained users to expect. This step wires all of them into
the keyboard built so far.

## Haptic feedback on every key

```ts showLineNumbers
function performHapticFeedback(): void;
```

```tsx showLineNumbers
import { commitText, performHapticFeedback } from 'react-native-keyboard-bridge';

function pressLetter(letter: string) {
  performHapticFeedback();
  commitText(letter);
}
```

One call, no configuration. On iOS this silently no-ops until the user has granted "Allow Full
Access" (a platform restriction, not a bug) — don't make it the *only* signal a press succeeded.

## Click sounds, per key type

```ts showLineNumbers
function playClickSound(effect?: string): void;

const SoundEffect = { STANDARD: 'standard', SPACEBAR: 'spacebar', DELETE: 'delete', RETURN: 'return', INVALID: 'invalid' };
```

```tsx showLineNumbers
import { playClickSound, SoundEffect, deleteSurroundingText } from 'react-native-keyboard-bridge';

<TouchableOpacity
  onPress={() => {
    playClickSound(SoundEffect.DELETE);
    deleteSurroundingText(1, 0);
  }}
>
  <Text>⌫</Text>
</TouchableOpacity>
```

iOS has exactly one system click sound regardless of which named effect you pass (the `effect`
argument is accepted but ignored there); Android maps each name to the matching
`AudioManager.FX_KEYPRESS_*` constant.

## Auto-capitalize like the system keyboard

```ts showLineNumbers
function getCursorCapsMode(reqModes?: number): Promise<number>;

const CapsModeRequest = { CHARACTERS: 1 << 0, WORDS: 1 << 1, SENTENCES: 1 << 2 };
```

```tsx showLineNumbers
import { useEffect, useState } from 'react';
import { getCursorCapsMode, CapsModeRequest } from 'react-native-keyboard-bridge';

function useAutoCapitalize() {
  const [shift, setShift] = useState(true); // sentence start on keyboard mount

  async function refresh() {
    const mode = await getCursorCapsMode(CapsModeRequest.SENTENCES);
    setShift(mode !== 0);
  }

  return { shift, setShift, refresh };
}
```

Call `refresh()` after every `commitText`/`deleteSurroundingText` call — a non-zero result means
the cursor sits where the system keyboard would auto-capitalize the next letter (start of a
sentence). On iOS this is a heuristic over `documentContextBeforeInput` rather than Android's exact
locale-aware algorithm, but it's close enough that users won't notice in normal typing.

## Adapt the return key to what the field actually wants

```ts showLineNumbers
function performEditorAction(actionCode: number): void;
function getCurrentEditorInfo(): Promise<EditorInfoDescriptor | null>;

const EditorActions = { GO: 2, SEARCH: 3, SEND: 4, NEXT: 5, DONE: 6 };
```

```tsx showLineNumbers
const [returnLabel, setReturnLabel] = useState('⏎');

useEffect(() => {
  getCurrentEditorInfo().then((info) => {
    if (info?.imeAction === EditorActions.SEARCH) setReturnLabel('Search');
    else if (info?.imeAction === EditorActions.NEXT) setReturnLabel('Next');
    else setReturnLabel('⏎');
  });
}, []);

<TouchableOpacity
  onPress={() => {
    if (returnLabel === '⏎') commitText('\n');
    else performEditorAction(EditorActions.SEARCH); // or whichever action was detected
  }}
>
  <Text>{returnLabel}</Text>
</TouchableOpacity>
```

A search box sets `IME_ACTION_SEARCH`; a single-line form field often sets `IME_ACTION_NEXT`. This
is Android-only — there's no generic "editor info"/"perform action" API on iOS, so
`getCurrentEditorInfo`/`performEditorAction` resolve safe defaults there instead of throwing, and
the return key simply always inserts a newline on iOS.

**Next:** [Let users enable it](./settings-screen) — the host-app screen that turns this keyboard
on.
