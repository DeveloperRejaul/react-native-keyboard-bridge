---
slug: any-language-any-script
title: "How to Support Multiple Languages in a React Native Keyboard (Bangla, Arabic, CJK & More)"
description: "Learn how to build a multi-language custom keyboard in React Native that supports Bangla, Arabic, Devanagari, CJK, and right-to-left scripts — with real Unicode, not transliteration."
keywords: [multi language keyboard react native, unicode keyboard react native, bangla keyboard react native, arabic keyboard react native, rtl keyboard react native, i18n keyboard]
authors: [rejaul]
tags: [i18n, react-native, keyboard]
---

A huge share of "custom keyboard" tutorials quietly assume English. The layout is QWERTY, the
examples commit ASCII, and anything beyond Latin script is left as "an exercise for the reader."
That's backwards for a huge portion of the world's keyboard users.

{/* truncate */}

## The library makes no assumption about script

`commitText` takes a plain Unicode string:

```ts showLineNumbers
function commitText(text: string): void;
```

Not a character code, not an ASCII byte, not a Latin-alphabet-shaped enum. Whatever string you
pass — `'a'`, `'অ'`, `'ا'`, `'あ'`, `'的'` — gets inserted at the cursor exactly the same way. There
is no script whitelist anywhere in the bridge.

## A Bangla row is exactly as valid as a QWERTY row

```tsx showLineNumbers
const BANGLA_ROW_1 = ['ঙ', 'অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ'];

<View style={styles.row}>
  {BANGLA_ROW_1.map((letter) => (
    <TouchableOpacity key={letter} onPress={() => commitText(letter)}>
      <Text style={styles.key}>{letter}</Text>
    </TouchableOpacity>
  ))}
</View>
```

No special-casing, no separate rendering path, no "non-Latin mode" flag threading through the
component tree. It's the same `commitText(letter)` call as any other key.

## Right-to-left scripts

Arabic keys work identically:

```tsx showLineNumbers
<TouchableOpacity onPress={() => commitText('ا')}>
  <Text style={styles.key}>ا</Text>
</TouchableOpacity>
```

The *keyboard UI itself* rendering right-to-left (row order, key alignment) is a React Native
layout concern you control with `flexDirection` and `I18nManager`, exactly like any other RN
screen — the library doesn't need to know about text direction at all, because it never
interprets the string, it only inserts it.

## Multiple layouts, one keyboard

The natural next step is a language switch key:

```tsx showLineNumbers
const [language, setLanguage] = useState<'en' | 'bn'>('en');
const rows = language === 'en' ? ENGLISH_ROWS : BANGLA_ROWS;

<TouchableOpacity onPress={() => setLanguage((l) => (l === 'en' ? 'bn' : 'en'))}>
  <Text>🌐</Text>
</TouchableOpacity>
```

This is *in-app* layout switching — a `useState` toggle that swaps which row data you render. It's
a different concern from `switchToNextInputMethod`, which asks the OS to switch to a *different
installed keyboard entirely*. Most bilingual keyboards want the former: one installed keyboard,
two (or more) layouts, one language-switch key. See the
[multi-language tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/multi-language) for the complete bilingual example.

## Frequently asked questions

### Can a React Native keyboard support non-English languages like Bangla or Arabic?

Yes. `commitText` takes a plain Unicode string with no script restriction — Bangla, Arabic,
Devanagari, CJK, Cyrillic, and any other script work identically to English, with no separate API
or "non-Latin mode."

### How do I switch between languages inside one keyboard?

Use local `useState` to track the active language and swap which row of key data you render — a
`🌐` key that toggles state, not a call into the native bridge. This keeps multiple layouts inside
one single installed keyboard app.

### Does this support right-to-left (RTL) languages?

Yes — `commitText('ا')` (Arabic) works exactly like `commitText('a')`. RTL layout direction
(row/key alignment) is handled with standard React Native `flexDirection`/`I18nManager`, the same
way any RTL screen is built.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

