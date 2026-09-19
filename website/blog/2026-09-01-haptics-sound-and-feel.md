---
slug: haptics-sound-and-feel
title: "How to Add Haptic Feedback and Click Sounds to a React Native Keyboard"
description: "Make a custom React Native keyboard feel native with haptic feedback, click sounds, and auto-capitalization — a practical guide with real API examples for both platforms."
keywords: [haptic feedback react native, keyboard click sound react native, auto capitalize keyboard, react native keyboard ux, performHapticFeedback]
authors: [rejaul]
tags: [ux, react-native, keyboard]
---

A keyboard that only commits the right characters still feels wrong if it doesn't vibrate, click,
or auto-capitalize the way the system keyboard does. Those details are small individually, but
they're the difference between "a keyboard" and "the keyboard I forgot wasn't the system one."

{/* truncate */}

## Haptic feedback on every key press

```ts showLineNumbers
function performHapticFeedback(): void;
```

One call, no configuration. On iOS, this silently no-ops until the user has granted "Allow Full
Access" — a platform restriction on extensions, not a bug — so don't rely on it as the only signal
a key press succeeded.

## Click sounds, with named effects

```ts showLineNumbers
function playClickSound(effect?: string): void;

const SoundEffect = {
  STANDARD: 'standard',
  SPACEBAR: 'spacebar',
  DELETE: 'delete',
  RETURN: 'return',
  INVALID: 'invalid',
};
```

```tsx showLineNumbers
<TouchableOpacity
  onPress={() => {
    playClickSound(SoundEffect.STANDARD);
    commitText('a');
  }}
>
```

iOS has exactly one system click sound regardless of which named effect you pass — the `effect`
argument is accepted but ignored there. Android maps each name to the matching
`AudioManager.FX_KEYPRESS_*` constant.

## Auto-capitalizing like the system keyboard

```ts showLineNumbers
function getCursorCapsMode(reqModes?: number): Promise<number>;

const CapsModeRequest = {
  CHARACTERS: 1 << 0,
  WORDS: 1 << 1,
  SENTENCES: 1 << 2,
};
```

```tsx showLineNumbers
useEffect(() => {
  getCursorCapsMode(CapsModeRequest.SENTENCES).then((mode) => {
    setShift(mode !== 0);
  });
}, [cursorPosition]);
```

This mirrors `android.text.TextUtils.CAP_MODE_*` — request `SENTENCES` and you get a non-zero
result exactly when the cursor sits at the start of a sentence, the same signal the system
keyboard uses to auto-capitalize the next letter. On iOS it's an approximation (a heuristic over
`documentContextBeforeInput`, not Android's exact locale-aware algorithm) but close enough that
users won't notice the difference in normal typing.

## Adapting the return key to context

```ts showLineNumbers
function performEditorAction(actionCode: number): void;

const EditorActions = {
  GO: 2, SEARCH: 3, SEND: 4, NEXT: 5, DONE: 6,
};
```

A search box sets `IME_ACTION_SEARCH`; a single-line form field often sets `IME_ACTION_NEXT`.
Reading which one is active (via `getCurrentEditorInfo`/`onEditorInfoChange` on Android) lets your
"return" key render "Search" or "Next" instead of a generic newline — and `performEditorAction`
lets pressing it actually trigger that action instead of inserting `\n` into a field that doesn't
want one. This is Android-only (no generic "perform action" API exists on iOS), so it's a safe
no-op there — see the [feel-and-polish tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/feel-and-polish) for wiring all of
this into one component.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

