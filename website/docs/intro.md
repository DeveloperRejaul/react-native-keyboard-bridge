---
sidebar_position: 1
slug: /
---

# Introduction

Build a mobile system keyboard (an Android IME / iOS Custom Keyboard Extension) out of ordinary
React Native components — `View`, `Text`, `TouchableOpacity`, JSX, `useState` — instead of writing
native UI for each platform. You write **one** hand-written component; it runs live on both.

```tsx showLineNumbers
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

export default function KeyboardApp() {
  const [shifted, setShifted] = useState(false);
  return (
    <View style={styles.row}>
      {['q', 'w', 'e', 'r', 't', 'y'].map((key) => (
        <TouchableOpacity key={key} onPress={() => commitText(shifted ? key.toUpperCase() : key)}>
          <Text style={styles.key}>{shifted ? key.toUpperCase() : key}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => deleteSurroundingText(1, 0)}>
        <Text style={styles.key}>⌫</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  key: { fontSize: 18, padding: 8 },
});
```

No schema, no config file, no proprietary layout DSL to learn — it's the React Native you already
know. Any language or script works: `commitText` takes a plain Unicode string, so Bangla, Arabic,
Devanagari, CJK, and right-to-left layouts are all first-class, not an afterthought.

## Why this exists

Every other approach to a custom keyboard on React Native means dropping into Kotlin and Swift and
re-implementing your UI twice, natively, by hand. This library hosts a **real, live** React Native
runtime — Hermes + JSI + Fabric — inside both the Android IME process and iOS's Custom Keyboard
Extension. One component, one runtime shape, so you write it once.

## What ships in one install

```bash
yarn add react-native-keyboard-bridge
```

That's the only package you install — the JS bridge, gesture/swipe-typing helpers, word
prediction, the Android native module (autolinked), the iOS native module, and the iOS setup CLI
all ship together. Continue to [Installation](./installation) for the platform setup steps.

## See everything the library can do

The [Tutorial](./tutorial/basic-keyboard) is the fastest way to see the whole surface area in
context — it builds one real keyboard from nothing, adding a capability at each step:

1. [A real QWERTY keyboard](./tutorial/basic-keyboard) — keys, shift, backspace, space, enter.
2. [Multi-language: English + Bangla](./tutorial/multi-language) — a second layout and a
   language-switch key, with real Unicode, not transliteration.
3. [Swipe-to-type](./tutorial/swipe-typing) — `keysAlongPath` gesture matching.
4. [Word prediction](./tutorial/word-prediction) — a suggestion bar backed by `WordPredictor`.
5. [Native feel](./tutorial/feel-and-polish) — haptics, click sounds, auto-capitalization, and
   editor-aware return keys.
6. [Let users enable it](./tutorial/settings-screen) — the host-app onboarding screen.

Once the single-file version feels familiar, [Advanced](./advanced/project-structure) shows how to
organize all of the above — layouts, gestures, prediction, polish — into a real, multi-file project
structure instead of one growing component.
