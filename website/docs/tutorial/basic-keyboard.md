---
sidebar_position: 1
title: "1. A Real QWERTY Keyboard"
---

# A Real QWERTY Keyboard

This tutorial builds one real, working keyboard from nothing — the same component running live on
Android and iOS — and adds a capability at each step: a full QWERTY layout, a second language,
swipe-typing, word prediction, native feel (haptics/sound/auto-caps), and finally the host-app
onboarding screen that lets a user turn it on. By the end you'll have touched every part of the
library's public API.

## Project setup

```bash
yarn add react-native-keyboard-bridge
```

```js showLineNumbers title="index.js"
import { AppRegistry } from 'react-native';
import App from './App';
import KeyboardApp from './src/keyboard/KeyboardApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
```

This one entry point registers **two** independent components: `App` (your app's own screen —
already scaffolded by the React Native CLI, and where you'll later add the
["enable keyboard" screen](./settings-screen)) and `KeyboardApp` (the fixed name both native
modules request a surface for). Neither imports the other. Everything from here on is the contents
of that second file, `src/keyboard/KeyboardApp.tsx`.

## Step 1: keys that commit text

A keyboard is state plus a grid of buttons. Start with the letter rows:

```tsx showLineNumbers
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText } from 'react-native-keyboard-bridge';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function KeyboardApp() {
  const [shift, setShift] = useState(false);

  function pressLetter(letter: string) {
    commitText(shift ? letter.toUpperCase() : letter);
    if (shift) setShift(false); // one-shot shift, like every mobile keyboard
  }

  return (
    <View style={styles.container}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((letter) => (
            <TouchableOpacity key={letter} style={styles.key} onPress={() => pressLetter(letter)}>
              <Text style={styles.label}>{shift ? letter.toUpperCase() : letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#d1d5db', paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  key: {
    flex: 1, margin: 2, height: 42, borderRadius: 4,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 16, color: '#111' },
});
```

`commitText(text: string): void` is the one function doing real work here — it inserts text at
the cursor through `InputConnection` on Android and `textDocumentProxy` on iOS. It takes a plain
Unicode string, which is the detail that makes [multi-language layouts](./multi-language) possible
later without any special-casing.

## Step 2: shift, backspace, space, enter

```tsx showLineNumbers
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

// Shift key — third row, before the letters
<TouchableOpacity
  style={[styles.key, styles.wideKey, shift && styles.keyActive]}
  onPress={() => setShift((s) => !s)}
>
  <Text style={styles.label}>⇧</Text>
</TouchableOpacity>

// Backspace — third row, after the letters
<TouchableOpacity style={[styles.key, styles.wideKey]} onPress={() => deleteSurroundingText(1, 0)}>
  <Text style={styles.label}>⌫</Text>
</TouchableOpacity>

// Bottom row
<View style={styles.row}>
  <TouchableOpacity style={[styles.key, styles.spaceKey]} onPress={() => commitText(' ')}>
    <Text style={styles.label}>space</Text>
  </TouchableOpacity>
  <TouchableOpacity style={[styles.key, styles.wideKey]} onPress={() => commitText('\n')}>
    <Text style={styles.label}>⏎</Text>
  </TouchableOpacity>
</View>
```

`deleteSurroundingText(before, after)` removes characters relative to the cursor —
`(1, 0)` is a standard single-character backspace. There's no dedicated "enter" API: committing a
newline character (`'\n'`) is exactly what a hardware Return key does, from the text field's point
of view, so it's just `commitText('\n')`.

## Step 3: register and run

Run the iOS setup once (Apple requires a distinct App Extension target — see
[Installation](../installation)):

```bash
npx react-native-keyboard-bridge setup-ios
bundle exec pod install
```

Android needs no extra step at all — the `<service>` declaration and native module registration
merge in automatically. Build both example apps, enable the keyboard from your device's Settings,
and you have a fully working, real React Native keyboard.

**Next:** [Add a second language](./multi-language) — this same component, extended with a Bangla
layout and a language-switch key.
