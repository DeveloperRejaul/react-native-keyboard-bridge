---
sidebar_position: 3
title: "3. Swipe-to-Type"
---

# Swipe-to-Type

Swipe-typing — dragging a finger across letters instead of tapping each one — is exposed as one
pure function: `keysAlongPath`. The library handles the geometry; you handle capturing the touch
path and deciding what to do with the result.

## Describe your layout as `Key`/`KeyRow` data

Gesture matching works on a small, explicit data shape — not your rendered `View` tree:

```tsx showLineNumbers
import type { Key, KeyRow } from 'react-native-keyboard-bridge';

function row(letters: string[]): KeyRow {
  return {
    keys: letters.map((letter) => ({
      id: letter,
      label: letter,
      width: 1, // one "standard key" unit each
      action: 'insertChar',
      value: letter,
    })),
  };
}

const ROWS: KeyRow[] = [
  row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']),
  row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']),
  row(['z', 'x', 'c', 'v', 'b', 'n', 'm']),
];
```

`width` and the implicit row height are in **grid units**, not pixels — `computeGeometry`
(used internally by `keysAlongPath`) lays keys out row-major, left to right, at `rowHeight` per
row (default `1`). A row of ten `width: 1` keys is 10 units wide; if you render that row across,
say, 360 real pixels, each unit is 36px.

## Capture the raw touch path

The library doesn't capture gestures for you — that's a `PanResponder` job, and it means
converting pixel coordinates into the same grid units your `Key.width`/`rowHeight` use:

```tsx showLineNumbers
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import { commitText, keysAlongPath } from 'react-native-keyboard-bridge';
import type { TouchPoint } from 'react-native-keyboard-bridge';

const KEY_SIZE_PX = 36; // must match your actual rendered key size

export default function KeyboardApp() {
  const path = useRef<TouchPoint[]>([]);
  const [preview, setPreview] = useState('');

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const point: TouchPoint = {
          x: gesture.moveX / KEY_SIZE_PX,
          y: gesture.moveY / KEY_SIZE_PX,
        };
        path.current.push(point);
        const visited = keysAlongPath(ROWS, path.current);
        setPreview(visited.map((k) => k.value ?? k.label).join(''));
      },
      onPanResponderRelease: () => {
        if (preview.length > 0) {
          commitText(preview);
        }
        path.current = [];
        setPreview('');
      },
    }),
  ).current;

  return (
    <View {...responder.panHandlers}>
      {/* render ROWS as TouchableOpacity keys, same as the basic keyboard tutorial */}
      {preview.length > 0 && (
        <View style={styles.previewBar}>
          <Text style={styles.previewText}>{preview}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  previewBar: { padding: 6, backgroundColor: '#e5e7eb' },
  previewText: { fontSize: 16, fontWeight: '600' },
});
```

`keysAlongPath(rows, path, rowHeight?)` returns the ordered, de-duplicated sequence of `Key`
objects the path crossed — points outside every key's bounds are ignored, and passing back over
the same key without leaving it first doesn't duplicate it in the result. Both `computeGeometry`
and `keysAlongPath` are pure, synchronous, and have zero React Native dependency, so you can unit
test your layout's gesture behavior (e.g. "does this exact path visit `h`, `e`, `l`, `l`, `o` in
order?") without a simulator or device at all.

## This is letters, not words — pair it with prediction

`keysAlongPath` gives you the literal keys a finger crossed. A real swipe keyboard then treats
that sequence as a *fuzzy* hint — feeding the joined string as a prefix into a
[`WordPredictor`](./word-prediction), or scoring dictionary candidates against the visited key
sequence to correct for an imprecise swipe — rather than committing the raw joined letters
directly the way the minimal example above does. The next section builds exactly that predictor
layer on top of this same gesture data.

**Next:** [Word prediction](./word-prediction) — turn a swiped or typed prefix into ranked
suggestions.
