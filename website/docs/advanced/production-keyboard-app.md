---
sidebar_position: 2
title: "2. A Complete, Production-Style KeyboardApp"
---

# A Complete, Production-Style KeyboardApp

This is the [project structure](./project-structure) from the previous page, filled in — a
bilingual (English/Bangla), swipe-capable, word-predicting keyboard with haptics and
auto-capitalization, organized the way you'd actually maintain it. Every function used here is
real library API, already covered in the [Tutorial](../tutorial/basic-keyboard); this page is
about the *organization*, not new bridge functions.

## Layout data

```ts showLineNumbers title="src/keyboard/layouts/types.ts"
export type Language = 'en' | 'bn';
```

```ts showLineNumbers title="src/keyboard/layouts/en.ts"
import type { KeyRow } from 'react-native-keyboard-bridge';

export const EN_LAYOUT: KeyRow[] = [
  {
    keys: [
      { id: 'q', label: 'q', width: 1, action: 'insertChar' },
      { id: 'w', label: 'w', width: 1, action: 'insertChar' },
      { id: 'e', label: 'e', width: 1, action: 'insertChar' },
      { id: 'r', label: 'r', width: 1, action: 'insertChar' },
      { id: 't', label: 't', width: 1, action: 'insertChar' },
      { id: 'y', label: 'y', width: 1, action: 'insertChar' },
      { id: 'u', label: 'u', width: 1, action: 'insertChar' },
      { id: 'i', label: 'i', width: 1, action: 'insertChar' },
      { id: 'o', label: 'o', width: 1, action: 'insertChar' },
      { id: 'p', label: 'p', width: 1, action: 'insertChar' },
    ],
  },
  {
    keys: [
      { id: 'a', label: 'a', width: 1, action: 'insertChar' },
      { id: 's', label: 's', width: 1, action: 'insertChar' },
      { id: 'd', label: 'd', width: 1, action: 'insertChar' },
      { id: 'f', label: 'f', width: 1, action: 'insertChar' },
      { id: 'g', label: 'g', width: 1, action: 'insertChar' },
      { id: 'h', label: 'h', width: 1, action: 'insertChar' },
      { id: 'j', label: 'j', width: 1, action: 'insertChar' },
      { id: 'k', label: 'k', width: 1, action: 'insertChar' },
      { id: 'l', label: 'l', width: 1, action: 'insertChar' },
    ],
  },
  {
    keys: [
      { id: 'shift', label: '⇧', width: 1.5, action: 'toggleShift' },
      { id: 'z', label: 'z', width: 1, action: 'insertChar' },
      { id: 'x', label: 'x', width: 1, action: 'insertChar' },
      { id: 'c', label: 'c', width: 1, action: 'insertChar' },
      { id: 'v', label: 'v', width: 1, action: 'insertChar' },
      { id: 'b', label: 'b', width: 1, action: 'insertChar' },
      { id: 'n', label: 'n', width: 1, action: 'insertChar' },
      { id: 'm', label: 'm', width: 1, action: 'insertChar' },
      { id: 'del', label: '⌫', width: 1.5, action: 'deleteBackward' },
    ],
  },
  {
    keys: [
      { id: 'lang', label: '🌐', width: 1.5, action: 'switchLanguage' },
      { id: 'space', label: 'space', width: 5, action: 'space', value: ' ' },
      { id: 'enter', label: '⏎', width: 1.5, action: 'enter', value: '\n' },
    ],
  },
];
```

```ts showLineNumbers title="src/keyboard/layouts/bn.ts"
import type { KeyRow } from 'react-native-keyboard-bridge';

export const BN_LAYOUT: KeyRow[] = [
  {
    keys: [
      { id: 'bn-ng', label: 'ঙ', width: 1, action: 'insertChar' },
      { id: 'bn-o', label: 'অ', width: 1, action: 'insertChar' },
      { id: 'bn-aa', label: 'আ', width: 1, action: 'insertChar' },
      { id: 'bn-i', label: 'ই', width: 1, action: 'insertChar' },
      { id: 'bn-ii', label: 'ঈ', width: 1, action: 'insertChar' },
      { id: 'bn-u', label: 'উ', width: 1, action: 'insertChar' },
      { id: 'bn-uu', label: 'ঊ', width: 1, action: 'insertChar' },
      { id: 'bn-e', label: 'এ', width: 1, action: 'insertChar' },
      { id: 'bn-oi', label: 'ঐ', width: 1, action: 'insertChar' },
    ],
  },
  {
    keys: [
      { id: 'bn-k', label: 'ক', width: 1, action: 'insertChar' },
      { id: 'bn-kh', label: 'খ', width: 1, action: 'insertChar' },
      { id: 'bn-g', label: 'গ', width: 1, action: 'insertChar' },
      { id: 'bn-gh', label: 'ঘ', width: 1, action: 'insertChar' },
      { id: 'bn-c', label: 'চ', width: 1, action: 'insertChar' },
      { id: 'bn-ch', label: 'ছ', width: 1, action: 'insertChar' },
      { id: 'bn-j', label: 'জ', width: 1, action: 'insertChar' },
      { id: 'bn-jh', label: 'ঝ', width: 1, action: 'insertChar' },
    ],
  },
  {
    keys: [
      { id: 'del', label: '⌫', width: 1.5, action: 'deleteBackward' },
      { id: 'bn-t', label: 'ত', width: 1, action: 'insertChar' },
      { id: 'bn-th', label: 'থ', width: 1, action: 'insertChar' },
      { id: 'bn-d', label: 'দ', width: 1, action: 'insertChar' },
      { id: 'bn-dh', label: 'ধ', width: 1, action: 'insertChar' },
      { id: 'bn-n', label: 'ন', width: 1, action: 'insertChar' },
    ],
  },
  {
    keys: [
      { id: 'lang', label: '🌐', width: 1.5, action: 'switchLanguage' },
      { id: 'space', label: 'স্পেস', width: 5, action: 'space', value: ' ' },
      { id: 'enter', label: '⏎', width: 1.5, action: 'enter', value: '\n' },
    ],
  },
];
```

```ts showLineNumbers title="src/keyboard/layouts/index.ts"
import type { KeyRow } from 'react-native-keyboard-bridge';
import type { Language } from './types';
import { EN_LAYOUT } from './en';
import { BN_LAYOUT } from './bn';

export type { Language };

export const LAYOUTS: Record<Language, KeyRow[]> = {
  en: EN_LAYOUT,
  bn: BN_LAYOUT,
};

export const NEXT_LANGUAGE: Record<Language, Language> = {
  en: 'bn',
  bn: 'en',
};
```

## Dictionary

```ts showLineNumbers title="src/keyboard/dictionary/en.ts"
export const EN_WORDS = [
  'hello', 'help', 'helm', 'held', 'hero', 'here', 'her',
  'react', 'native', 'keyboard', 'component', 'commit',
  // ...your real word list
];
```

## Reusable components

```tsx showLineNumbers title="src/keyboard/components/KeyButton.tsx"
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Key } from 'react-native-keyboard-bridge';

type Props = {
  keyData: Key;
  active?: boolean;
  onPress: (key: Key) => void;
};

export default function KeyButton({ keyData, active, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.key,
        { flex: keyData.width },
        active && styles.keyActive,
      ]}
      onPress={() => onPress(keyData)}
    >
      <Text style={styles.label}>{keyData.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  key: {
    margin: 2,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyActive: {
    backgroundColor: '#a9b4c0',
  },
  label: {
    fontSize: 16,
    color: '#1c1c1e',
  },
});
```

```tsx showLineNumbers title="src/keyboard/components/KeyboardRow.tsx"
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Key, KeyRow } from 'react-native-keyboard-bridge';
import KeyButton from './KeyButton';

type Props = {
  row: KeyRow;
  shiftActive: boolean;
  onKeyPress: (key: Key) => void;
};

export default function KeyboardRow({ row, shiftActive, onKeyPress }: Props) {
  return (
    <View style={styles.row}>
      {row.keys.map((key) => (
        <KeyButton
          key={key.id}
          keyData={key}
          active={key.action === 'toggleShift' && shiftActive}
          onPress={onKeyPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
```

```tsx showLineNumbers title="src/keyboard/components/SuggestionBar.tsx"
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  suggestions: string[];
  onSelect: (word: string) => void;
};

export default function SuggestionBar({ suggestions, onSelect }: Props) {
  return (
    <View style={styles.bar}>
      {suggestions.map((word) => (
        <TouchableOpacity key={word} onPress={() => onSelect(word)} style={styles.item}>
          <Text style={styles.text}>{word}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 36, alignItems: 'center', paddingHorizontal: 8 },
  item: { paddingHorizontal: 10 },
  text: { fontWeight: '600', color: '#2563eb' },
});
```

## Hooks for cross-cutting behavior

```ts showLineNumbers title="src/keyboard/hooks/useAutoCapitalize.ts"
import { useState, useCallback } from 'react';
import { getCursorCapsMode, CapsModeRequest } from 'react-native-keyboard-bridge';

export function useAutoCapitalize() {
  const [shift, setShift] = useState(true);

  const refresh = useCallback(async () => {
    const mode = await getCursorCapsMode(CapsModeRequest.SENTENCES);
    setShift(mode !== 0);
  }, []);

  return { shift, setShift, refresh };
}
```

```ts showLineNumbers title="src/keyboard/hooks/useKeyFeedback.ts"
import { useCallback } from 'react';
import { performHapticFeedback, playClickSound, SoundEffect } from 'react-native-keyboard-bridge';

export function useKeyFeedback() {
  return useCallback((effect: string = SoundEffect.STANDARD) => {
    performHapticFeedback();
    playClickSound(effect);
  }, []);
}
```

```ts showLineNumbers title="src/keyboard/hooks/useSuggestions.ts"
import { useMemo, useState } from 'react';
import { StaticDictionaryPredictor } from 'react-native-keyboard-bridge';
import { deleteSurroundingText, commitText } from 'react-native-keyboard-bridge';

export function useSuggestions(words: string[]) {
  const predictor = useMemo(() => new StaticDictionaryPredictor(words), [words]);
  const [current, setCurrent] = useState('');
  const suggestions = predictor.suggest(current);

  function trackChar(char: string) {
    setCurrent((word) => word + char);
  }

  function reset() {
    setCurrent('');
  }

  function accept(word: string) {
    if (current.length > 0) {
      deleteSurroundingText(current.length, 0);
    }
    commitText(word + ' ');
    reset();
  }

  return { suggestions, trackChar, reset, accept };
}
```

## The composition root

```tsx showLineNumbers title="src/keyboard/KeyboardApp.tsx"
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Key } from 'react-native-keyboard-bridge';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

import { LAYOUTS, NEXT_LANGUAGE, type Language } from './layouts';
import { EN_WORDS } from './dictionary/en';
import KeyboardRow from './components/KeyboardRow';
import SuggestionBar from './components/SuggestionBar';
import { useAutoCapitalize } from './hooks/useAutoCapitalize';
import { useKeyFeedback } from './hooks/useKeyFeedback';
import { useSuggestions } from './hooks/useSuggestions';

export default function KeyboardApp() {
  const [language, setLanguage] = useState<Language>('en');
  const { shift, setShift, refresh } = useAutoCapitalize();
  const playFeedback = useKeyFeedback();
  const { suggestions, trackChar, reset, accept } = useSuggestions(EN_WORDS);

  function handleKeyPress(key: Key) {
    playFeedback();

    switch (key.action) {
      case 'toggleShift':
        setShift((s) => !s);
        return;
      case 'switchLanguage':
        setLanguage((lang) => NEXT_LANGUAGE[lang]);
        reset();
        return;
      case 'deleteBackward':
        deleteSurroundingText(1, 0);
        reset();
        refresh();
        return;
      case 'space':
      case 'enter':
        commitText(key.value ?? key.label);
        reset();
        refresh();
        return;
      case 'insertChar':
      default: {
        const char = key.value ?? key.label;
        const text = language === 'en' && shift ? char.toUpperCase() : char;
        commitText(text);
        if (language === 'en') trackChar(text);
        if (shift) setShift(false);
        refresh();
      }
    }
  }

  return (
    <View style={styles.container}>
      {language === 'en' && suggestions.length > 0 && (
        <SuggestionBar suggestions={suggestions} onSelect={accept} />
      )}
      {LAYOUTS[language].map((row, i) => (
        <KeyboardRow key={i} row={row} shiftActive={shift} onKeyPress={handleKeyPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#d1d5db', paddingVertical: 4 },
});
```

`KeyboardApp.tsx` is now a **composition root** — it wires layouts, components, and hooks
together, and it's the only file that calls bridge functions directly. Every other file is plain,
independently testable TypeScript/React that has no idea it's running inside a keyboard extension.

Register it exactly the same way as the single-file version:

```js showLineNumbers title="index.js"
import { AppRegistry } from 'react-native';
import KeyboardApp from './src/keyboard/KeyboardApp';

AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
```
