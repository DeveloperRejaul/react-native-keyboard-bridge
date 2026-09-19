---
sidebar_position: 3
title: "3. User-Configurable Settings & Theming"
---

# User-Configurable Settings & Theming

A production keyboard usually needs to be more than one fixed look — users expect to pick a
theme, turn haptics or click sounds off, or adjust other preferences from your app, and have the
keyboard respect that the next time it opens. This page covers the one genuinely tricky part of
that: **the keyboard extension and your host app run in separate processes, so "just read some
state" isn't as simple as it is in a normal screen-to-screen app.**

## The storage problem, per platform

- **Android**: `CustomKeyboardService` runs inside *your app's own process* (see
  [Android IME architecture](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/android-ime-architecture)) — so a normal async storage
  library (e.g. `@react-native-async-storage/async-storage`, or `react-native-mmkv`) already works
  from both the host app and the keyboard with no extra setup. Write from `App.tsx`, read from
  `KeyboardApp.tsx`, done.
- **iOS**: the Custom Keyboard Extension is a genuinely separate OS process from your host app.
  Plain `AsyncStorage`/`UserDefaults.standard` in the extension does **not** see what the host app
  wrote, and vice versa. Apple's supported mechanism for this is an **App Group** — a shared
  container both your app and its extension are allowed to read and write — accessed via
  `UserDefaults(suiteName: "group.your.app.identifier")` on the native side. This library doesn't
  ship an App Group bridge itself (see [API reference](../api/overview) for the current surface);
  you'd add a small native module for it, or use a community package that already wraps App Group
  `UserDefaults` (e.g. `react-native-shared-group-preferences`), and enable the **App Groups**
  capability for both the host app target and the `CustomKeyboardExtension` target in Xcode.

The pattern below is written against a `KeyboardSettingsStore` interface precisely so you can swap
in whichever storage actually crosses the process boundary on each platform, without changing any
of the UI code.

## Define the shape of your settings

```ts showLineNumbers title="src/keyboard/settings/types.ts"
export type KeyboardThemeName = 'light' | 'dark' | 'ocean';

export interface KeyboardPreferences {
  theme: KeyboardThemeName;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_PREFERENCES: KeyboardPreferences = {
  theme: 'light',
  hapticsEnabled: true,
  soundEnabled: true,
};
```

```ts showLineNumbers title="src/keyboard/settings/themes.ts"
import type { KeyboardThemeName } from './types';

export interface KeyboardTheme {
  background: string;
  keyBackground: string;
  keyText: string;
  keyActiveBackground: string;
}

export const THEMES: Record<KeyboardThemeName, KeyboardTheme> = {
  light: {
    background: '#d1d5db',
    keyBackground: '#ffffff',
    keyText: '#1c1c1e',
    keyActiveBackground: '#a9b4c0',
  },
  dark: {
    background: '#1c1c1e',
    keyBackground: '#3a3a3c',
    keyText: '#ffffff',
    keyActiveBackground: '#636366',
  },
  ocean: {
    background: '#012c82',
    keyBackground: '#ffffff',
    keyText: '#012c82',
    keyActiveBackground: '#9abcf2',
  },
};
```

## A storage-agnostic settings store

```ts showLineNumbers title="src/keyboard/settings/store.ts"
import { DEFAULT_PREFERENCES, type KeyboardPreferences } from './types';

// Swap this implementation per platform — AsyncStorage/MMKV on Android works as-is;
// on iOS back it with an App-Group-aware read/write (see the note above).
export interface KeyboardSettingsStore {
  load(): Promise<KeyboardPreferences>;
  save(prefs: KeyboardPreferences): Promise<void>;
}

// Example using @react-native-async-storage/async-storage — fine on Android;
// on iOS, replace getItem/setItem with your App Group-backed equivalent.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'keyboard-preferences';

export const asyncStorageSettingsStore: KeyboardSettingsStore = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  },
  async save(prefs) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  },
};
```

## A settings screen in the host app

```tsx showLineNumbers title="App.tsx (excerpt)"
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Button } from 'react-native';
import { asyncStorageSettingsStore } from './src/keyboard/settings/store';
import { DEFAULT_PREFERENCES, type KeyboardPreferences } from './src/keyboard/settings/types';

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<KeyboardPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    asyncStorageSettingsStore.load().then(setPrefs);
  }, []);

  function update(patch: Partial<KeyboardPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    asyncStorageSettingsStore.save(next);
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text style={{ fontWeight: '700' }}>Keyboard settings</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['light', 'dark', 'ocean'] as const).map((theme) => (
          <Button key={theme} title={theme} onPress={() => update({ theme })} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Haptic feedback</Text>
        <Switch
          value={prefs.hapticsEnabled}
          onValueChange={(hapticsEnabled) => update({ hapticsEnabled })}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Click sound</Text>
        <Switch
          value={prefs.soundEnabled}
          onValueChange={(soundEnabled) => update({ soundEnabled })}
        />
      </View>
    </View>
  );
}
```

## Reading preferences inside the keyboard

The keyboard reloads on every activation (`onStartInputView` on Android, the equivalent
view-appearance lifecycle on iOS — see [How It Works](../how-it-works)), so loading preferences on
mount picks up whatever the user last saved in the host app — no live IPC needed, just
read-on-open:

```tsx showLineNumbers title="src/keyboard/KeyboardApp.tsx (excerpt)"
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { performHapticFeedback, playClickSound } from 'react-native-keyboard-bridge';
import { asyncStorageSettingsStore } from './settings/store';
import { THEMES } from './settings/themes';
import { DEFAULT_PREFERENCES, type KeyboardPreferences } from './settings/types';

export default function KeyboardApp() {
  const [prefs, setPrefs] = useState<KeyboardPreferences>(DEFAULT_PREFERENCES);
  const theme = THEMES[prefs.theme];

  useEffect(() => {
    asyncStorageSettingsStore.load().then(setPrefs);
  }, []);

  function onKeyPress() {
    if (prefs.hapticsEnabled) performHapticFeedback();
    if (prefs.soundEnabled) playClickSound();
    // ...commitText / deleteSurroundingText, same as always
  }

  return <View style={[styles.container, { backgroundColor: theme.background }]}>{/* rows */}</View>;
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
});
```

Pass `theme` down to `KeyButton` (see [Project Structure](./project-structure)) so
`keyBackground`/`keyText`/`keyActiveBackground` replace the hardcoded colors used in the tutorial
and production examples — the same component, now themeable.

## What this doesn't cover

Live-updating an *already-open* keyboard the instant a setting changes in the host app (without
closing and reopening the keyboard) needs an actual cross-process signal — on Android that's
realistic (shared process, e.g. a `BroadcastReceiver` or an event emitter), but on iOS there is no
supported way for a running app to push a live update into a running extension process; the
read-on-open pattern above is the practical approach both platforms actually support.
