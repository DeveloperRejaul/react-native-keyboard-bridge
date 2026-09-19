---
slug: announcing-react-native-keyboard-bridge
title: "Can You Build a Custom Keyboard App in React Native? (Yes — Here's How)"
description: "Build a real Android IME and iOS Custom Keyboard Extension using only React Native components — no native Kotlin/Swift UI required. Here's how react-native-keyboard-bridge makes it possible."
keywords: [react native keyboard, custom keyboard react native, build keyboard app react native, android ime react native, ios custom keyboard extension react native, react native ime]
authors: [rejaul]
tags: [announcement, react-native, keyboard, android, ios]
---

Can you actually build a production system keyboard — an Android IME, an iOS Custom Keyboard
Extension — entirely in React Native? Not a demo, not a toy, but something you'd ship to real
users on both platforms from one codebase?

**Yes. This is the proof, and the library that makes it repeatable.**

Every mobile app that wants a custom system keyboard has run into the same wall: Android IMEs and
iOS Custom Keyboard Extensions are native surfaces. Building one has always meant writing (and
maintaining) two separate native UIs in Kotlin and Swift — even if your app is otherwise 100%
React Native. Most teams either give up on the idea or pay for a fully native rewrite of a single
screen.

**react-native-keyboard-bridge** removes that wall. You write one component — plain `View`,
`Text`, `TouchableOpacity`, `useState` — and it runs live on both platforms, as a real, live React
Native surface hosted inside the IME process on Android and the Custom Keyboard Extension process
on iOS. Not a schema. Not a subset. Real React Native, running where conventional wisdom said it
couldn't.

{/* truncate */}

## What "runs live" actually means

This isn't a schema you configure, and it isn't a compiled subset of JSX rendered by a
hand-written interpreter. It's Hermes + JSI + Fabric — the exact same New Architecture stack any
other React Native screen in your app uses — hosted inside a process that most people assumed
couldn't afford it.

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

That's the entire keyboard. No `KeyLayout` schema to learn, no proprietary DSL, no
platform-specific branch in your component. `commitText` takes a plain Unicode string, so this
works identically whether you're typing English, Bangla, Arabic, or any other script.

## One install

```bash
yarn add react-native-keyboard-bridge
```

The JS bridge, the Android native module (autolinked), the iOS native module, gesture/
swipe-typing helpers, word prediction, and the iOS setup CLI all ship in this single package. See
the [Installation guide](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/installation) to get a keyboard running in your app today, or read
[Building Your First Keyboard](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/building-your-first-keyboard) for a full walkthrough.

## Frequently asked questions

### Can you build a custom keyboard app with React Native?

Yes. `react-native-keyboard-bridge` hosts a real, live React Native runtime — Hermes, JSI, and
Fabric — directly inside the Android IME process and the iOS Custom Keyboard Extension process.
Your keyboard component runs unmodified, the same way any other React Native screen does.

### Is it a real Android IME and a real iOS Custom Keyboard Extension, or just a demo?

Both are real, installable system keyboards. On Android, `CustomKeyboardService` extends
`InputMethodService` directly. On iOS, `KeyboardViewController` extends `UIInputViewController`
inside a genuine Xcode App Extension target. Once installed and enabled, either one appears in the
OS keyboard list exactly like any native keyboard app.

### Do I need to write any native Kotlin or Swift code?

No. The native side (Kotlin on Android, Swift on iOS) is entirely provided by the library — it
only wires up the runtime and a text-editing bridge. Your own code is 100% React Native/TypeScript.

### Does it support languages other than English?

Yes — `commitText` takes a plain Unicode string with no script whitelist, so Bangla, Arabic,
Devanagari, CJK, Cyrillic, and right-to-left layouts all work identically to English. See
[How to Support Multiple Languages in a React Native Keyboard](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/any-language-any-script).

### What React Native version does it require?

React Native 0.74 or later (New Architecture / Fabric), since the library depends on `ReactHost`
on Android and `RCTReactNativeFactory` on iOS — both New Architecture APIs.

## Try it yourself

- 📦 Install: `yarn add react-native-keyboard-bridge`
- 📖 Full docs & step-by-step tutorial: [developerrejaul.github.io/react-native-keyboard-bridge](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ Source & issues: [github.com/DeveloperRejaul/react-native-keyboard-bridge](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 Package: [npmjs.com/package/react-native-keyboard-bridge](https://www.npmjs.com/package/react-native-keyboard-bridge)

If you've ever been told "you can't build a real keyboard in React Native," this library — and
the working example app in the repo — is the counter-argument.
