---
slug: building-your-first-keyboard
title: "How to Build a Custom Keyboard in React Native (Step-by-Step Tutorial)"
description: "A complete step-by-step tutorial for building a real, working QWERTY keyboard in React Native — shift, backspace, space, enter, and registering it as a system keyboard on Android and iOS."
keywords: [react native keyboard tutorial, how to build a keyboard in react native, custom keyboard tutorial, react native ime tutorial, react native keyboard extension]
authors: [rejaul]
tags: [tutorial, react-native, keyboard]
---

This is the walkthrough version of the [Tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/basic-keyboard) — a from-scratch
build of a real, usable QWERTY keyboard, explained step by step.

{/* truncate */}

## Start with the keys

A keyboard component is just state plus a grid of buttons. No special base class, no required
props shape:

```tsx showLineNumbers
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function KeyboardApp() {
  const [shift, setShift] = useState(false);

  function press(letter: string) {
    commitText(shift ? letter.toUpperCase() : letter);
    if (shift) setShift(false);
  }

  return (
    <View style={styles.container}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((letter) => (
            <TouchableOpacity key={letter} style={styles.key} onPress={() => press(letter)}>
              <Text style={styles.label}>{shift ? letter.toUpperCase() : letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}
```

`commitText` is the one function doing the real work — it inserts text at the cursor through
`InputConnection` on Android and `textDocumentProxy` on iOS. Everything else here is plain React
Native UI.

## Add shift, backspace, space, and enter

```tsx showLineNumbers
<TouchableOpacity onPress={() => setShift((s) => !s)}>
  <Text>⇧</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => deleteSurroundingText(1, 0)}>
  <Text>⌫</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => commitText(' ')}>
  <Text>space</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => commitText('\n')}>
  <Text>⏎</Text>
</TouchableOpacity>
```

`deleteSurroundingText(before, after)` removes characters relative to the cursor — `(1, 0)` is a
standard single-character backspace. There's no special "enter" API to call; committing a newline
character is exactly what a hardware Return key does from the text field's point of view.

## Register it

```js showLineNumbers title="index.js"
import { AppRegistry } from 'react-native';
import KeyboardApp from './src/keyboard/KeyboardApp';

AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
```

The name `KeyboardApp` is fixed — both native modules request a surface with exactly this
component name. Run `npx react-native-keyboard-bridge setup-ios` once for the iOS App Extension
target, and Android needs no extra wiring at all.

That's a fully working keyboard in under 60 lines. From here, the [full tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/basic-keyboard)
continues into multi-language layouts, swipe typing, word prediction, and the polish details
(haptics, click sounds, auto-capitalization) that make a keyboard feel native.

## Frequently asked questions

### How do I make a custom keyboard in React Native?

Write a plain component using `View`/`Text`/`TouchableOpacity`, call `commitText`/
`deleteSurroundingText` from `react-native-keyboard-bridge` on key presses, and register it under
the fixed name `KeyboardApp` in your `index.js`. No schema or special base class required.

### Do I need a different component for Android and iOS?

No — the exact same `KeyboardApp.tsx` file runs unmodified on both platforms.

### How does the backspace key work?

`deleteSurroundingText(before, after)` removes characters relative to the cursor —
`deleteSurroundingText(1, 0)` deletes exactly one character before the cursor, the same as a
standard backspace.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

