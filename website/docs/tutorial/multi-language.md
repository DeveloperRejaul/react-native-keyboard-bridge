---
sidebar_position: 2
title: "2. Multi-Language: English + Bangla"
---

# Multi-Language: English + Bangla

`commitText` takes a plain Unicode string — there is no script whitelist anywhere in the bridge.
That means a second (or third, or tenth) language layout is not a special mode the library needs
to know about; it's just different row data rendered by the exact same component.

## Define both layouts

```tsx showLineNumbers
const ENGLISH_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

// Bangla vowels + a selection of consonants — real Unicode characters, not transliteration
const BANGLA_ROWS = [
  ['ঙ', 'অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ'],
  ['ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ঝ', 'ট'],
  ['ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ'],
];
```

## Switch layouts with local state

```tsx showLineNumbers
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

type Language = 'en' | 'bn';

export default function KeyboardApp() {
  const [language, setLanguage] = useState<Language>('en');
  const [shift, setShift] = useState(false);
  const rows = language === 'en' ? ENGLISH_ROWS : BANGLA_ROWS;

  function pressKey(char: string) {
    // Only Latin script has a meaningful uppercase transform
    commitText(language === 'en' && shift ? char.toUpperCase() : char);
    if (shift) setShift(false);
  }

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((char) => (
            <TouchableOpacity key={char} style={styles.key} onPress={() => pressKey(char)}>
              <Text style={styles.label}>
                {language === 'en' && shift ? char.toUpperCase() : char}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {language === 'en' && (
          <TouchableOpacity
            style={[styles.key, styles.wideKey, shift && styles.keyActive]}
            onPress={() => setShift((s) => !s)}
          >
            <Text style={styles.label}>⇧</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.key, styles.wideKey]}
          onPress={() => setLanguage((l) => (l === 'en' ? 'bn' : 'en'))}
        >
          <Text style={styles.label}>🌐</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.key, styles.wideKey]} onPress={() => deleteSurroundingText(1, 0)}>
          <Text style={styles.label}>⌫</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.key, styles.spaceKey]} onPress={() => commitText(' ')}>
          <Text style={styles.label}>{language === 'en' ? 'space' : 'স্পেস'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.key, styles.wideKey]} onPress={() => commitText('\n')}>
          <Text style={styles.label}>⏎</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

The 🌐 key is a `useState` toggle — it swaps which row data renders. It does not call any bridge
function; it's pure React state local to your component, exactly like switching tabs in any other
screen.

## Don't confuse this with `switchToNextInputMethod`

There are two genuinely different things a "globe" key can mean, and mixing them up is the most
common multi-language mistake:

| | What it does | When to use it |
|---|---|---|
| A `useState` toggle (above) | Swaps which **layout** *this same installed keyboard* renders | You maintain both language layouts yourself, in one keyboard |
| `switchToNextInputMethod()` | Asks the **OS** to switch to a *different installed keyboard entirely* | The user has multiple separate keyboard apps installed and wants to cycle between them |

Most bilingual keyboards want the first pattern: one installed keyboard, several layouts, one
in-keyboard language-switch key — so users never have to leave your keyboard to type in either
language.

## Right-to-left scripts work the same way

Arabic, Hebrew, or any RTL script needs no special bridge call — `commitText('ا')` is exactly the
same call as `commitText('a')`. What changes is the *keyboard UI's own layout* — you control
row/key alignment with `flexDirection` and `I18nManager`, exactly like any other React Native
screen, because the library never interprets the string, it only inserts it.

**Next:** [Add swipe-to-type](./swipe-typing) — dragging a finger across letters instead of
tapping each one.
