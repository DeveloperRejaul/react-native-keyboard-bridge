---
slug: swipe-to-type
title: "How to Add Swipe-to-Type (Gesture Typing) to a React Native Keyboard"
description: "A step-by-step guide to implementing swipe-to-type gesture typing in a React Native custom keyboard using keysAlongPath and PanResponder, with full working code."
keywords: [swipe to type react native, gesture typing keyboard, react native panresponder keyboard, swipe keyboard tutorial, keysAlongPath]
authors: [rejaul]
tags: [gestures, react-native, keyboard]
---

Swipe-typing (dragging a finger across letters instead of tapping each one) looks like a hard
geometry problem, and it's easy to over-engineer. The library reduces it to one pure function:
`keysAlongPath`.

{/* truncate */}

## The data shape

Gesture matching works on the same `Key`/`KeyRow` shape used for layout — no separate schema:

```ts showLineNumbers
interface Key {
  id: string;
  label: string;
  width: number; // in "standard key" units
  action: KeyAction;
  value?: string;
}
interface KeyRow {
  keys: Key[];
}
```

`computeGeometry(rows, rowHeight)` lays these out on a grid (row-major, left to right) in the same
units as `width`/`rowHeight` — not pixels. `keysAlongPath(rows, path)` uses that geometry
internally and returns the ordered, de-duplicated sequence of keys a raw touch path crossed:

```ts showLineNumbers
function keysAlongPath(rows: KeyRow[], path: TouchPoint[], rowHeight = 1): Key[];
interface TouchPoint { x: number; y: number; }
```

Both are pure, synchronous, and have zero React Native dependency — they're plain TypeScript, so
you can unit test your layout's gesture behavior without a simulator.

## Wiring it to a real gesture

The one thing the library doesn't do for you is capture the raw touch path — that's a
`PanResponder` (or `react-native-gesture-handler`) concern, and it means converting pixel
coordinates into the same grid units your `Key.width`/`rowHeight` use:

```tsx showLineNumbers
const KEY_SIZE_PX = 36;
const path = useRef<TouchPoint[]>([]);

const responder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      path.current.push({
        x: gesture.moveX / KEY_SIZE_PX,
        y: gesture.moveY / KEY_SIZE_PX,
      });
    },
    onPanResponderRelease: () => {
      const visited = keysAlongPath(ROWS, path.current);
      const word = visited.map((k) => k.value ?? k.label).join('');
      commitText(word);
      path.current = [];
    },
  }),
).current;
```

## Where dictionary correction fits in

`keysAlongPath` gives you the literal letters a finger crossed — real swipe keyboards then run
that sequence (or, more precisely, the *shape* of the path) against a dictionary to correct for
imprecise swipes. That's exactly where `WordPredictor` composes with this: treat the joined
letters as a prefix, or score dictionary candidates against the visited key sequence, and offer the
result as a suggestion rather than committing directly. See
[Word Prediction in ~50 Lines](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/word-prediction-in-50-lines) for the predictor side, and the
[swipe-typing tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/swipe-typing) for the full gesture-to-commit flow.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

