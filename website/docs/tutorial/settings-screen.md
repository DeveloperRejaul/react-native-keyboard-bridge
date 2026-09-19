---
sidebar_position: 6
title: "6. Let Users Enable It"
---

# Let Users Enable It

None of the previous five steps matter if the keyboard never gets turned on. Neither Android nor
iOS lets an app silently register itself as an active input method — this last step builds the
onboarding screen that guides a user through it, from your app's own UI.

## The four settings functions

```ts showLineNumbers
function openInputMethodSettings(): void;
function showInputMethodPicker(): void;
function isKeyboardEnabled(): Promise<boolean>;
function isKeyboardSelected(): Promise<boolean>;
```

These run from your **host app's** own screen — never from inside the keyboard component itself.

## A real three-state onboarding screen

```tsx showLineNumbers
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import {
  openInputMethodSettings,
  showInputMethodPicker,
  isKeyboardEnabled,
  isKeyboardSelected,
} from 'react-native-keyboard-bridge';

export default function EnableKeyboardScreen() {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState(false);

  async function refresh() {
    setEnabled(await isKeyboardEnabled());
    setSelected(await isKeyboardSelected());
  }

  useEffect(() => {
    refresh();
  }, []);

  if (selected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You're all set 🎉</Text>
        <Text>This keyboard is enabled and active.</Text>
      </View>
    );
  }

  if (enabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Almost there</Text>
        <Text style={styles.body}>Switch to this keyboard to start using it.</Text>
        <Button title="Switch keyboard" onPress={() => showInputMethodPicker().then(refresh)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable your keyboard</Text>
      <Text style={styles.body}>
        Turn this keyboard on in Settings, then come back here.
      </Text>
      <Button title="Open keyboard settings" onPress={() => openInputMethodSettings().then(refresh)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { textAlign: 'center', color: '#4b5563' },
});
```

`openInputMethodSettings` opens system Settings' keyboard-management screen directly on Android —
the user toggles the keyboard on and returns. `showInputMethodPicker` then opens the system's own
keyboard-switcher sheet so they can make it active without leaving the app.

## iOS takes a shorter deep link, then manual navigation

`openInputMethodSettings` still works on iOS, but Apple exposes no deeper deep link than *this
app's own Settings page* — there's no API to jump straight to General > Keyboard > Keyboards. The
user still takes that last step themselves. `showInputMethodPicker`, `isKeyboardEnabled`, and
`isKeyboardSelected` have no iOS equivalent at all — no API lets a containing app query or drive
picker state — so they resolve a safe default (`false`/no-op) instead of throwing. Concretely: the
same `EnableKeyboardScreen` above naturally degrades to just the "Open keyboard settings" button on
iOS, since `enabled`/`selected` never become `true` there. Add a short caption for iOS explaining
the manual path: *"then go to General > Keyboard > Keyboards > [Your App] and turn on Allow Full
Access if prompted."*

## You've now used the whole library

Text editing (`commitText`, `deleteSurroundingText`), gesture matching (`keysAlongPath`,
`computeGeometry`), word prediction (`WordPredictor`, `StaticDictionaryPredictor`), native feel
(`performHapticFeedback`, `playClickSound`, `getCursorCapsMode`, `performEditorAction`), and the
settings functions that get a real user to actually use it. See the
[full API reference](../api/overview) for everything not covered in this walkthrough — including
the Android-only functions (`setSelection`, composing-text, batch-edit) that are safe no-ops on
iOS but real capabilities on Android if your keyboard needs them.
