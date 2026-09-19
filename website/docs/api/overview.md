---
sidebar_position: 1
---

# Overview

There is no `KeyLayout`/schema type and no ready-to-use keyboard component in this library — a
keyboard is a hand-written `View`/`Text`/`TouchableOpacity` component you write yourself, the same
file running live on **both** Android and iOS (real React Native, Hermes + JSI + Fabric). Beyond
the bridge/settings functions, this package also supplies the `Key`/`KeyRow` data shape used by
the gesture-matching feature, word prediction, and iOS's setup CLI.

## `Key` / `KeyRow` / `KeyAction`

```ts showLineNumbers
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

This is data modeling for the gesture-matching feature below (`keysAlongPath` returns `Key[]`) —
it isn't rendered by anything and doesn't restrict script or language: `label`/`value` are plain
Unicode strings, so a `Key` can represent any language/script (Arabic, Devanagari, CJK, Cyrillic,
Bangla, etc.) the same way.

## Geometry

### `computeGeometry(rows, rowHeight = 1): KeyGeometry[]`

Lays out a set of rows on a grid (row-major, left-to-right) in "standard key" units. Pure/
deterministic. Used by the gesture matcher below.

```ts showLineNumbers
interface KeyGeometry { key: Key; x0: number; x1: number; y0: number; y1: number; }
```

## Gestures

### `keysAlongPath(rows, path, rowHeight = 1): Key[]`

Given a set of rows and a raw touch path (`TouchPoint[]`, same units as geometry), returns the
ordered, de-duplicated sequence of keys the path passed over. Points outside every key are
ignored. Pure function — no I/O.

```ts showLineNumbers
interface TouchPoint { x: number; y: number; }
```

## Word prediction

### `WordPredictor` (interface)

```ts showLineNumbers
interface WordPredictor {
  suggest(prefix: string, options?: SuggestOptions): string[];
}
interface SuggestOptions { limit?: number; } // default 3
```

Pluggable — apps may supply frequency-weighted or ML-backed implementations.

### `StaticDictionaryPredictor`

Minimal `WordPredictor` backed by an in-memory word list. Case-insensitive prefix match, ranked
shortest-then-alphabetical.
