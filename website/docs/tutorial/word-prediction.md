---
sidebar_position: 4
title: "4. Word Prediction"
---

# Word Prediction

Word prediction is one interface — `WordPredictor` — with a minimal built-in implementation,
`StaticDictionaryPredictor`, that you can use as-is or replace entirely with something
frequency-weighted or ML-backed. Nothing else in the library cares which one you use.

## The interface

```ts showLineNumbers
interface WordPredictor {
  suggest(prefix: string, options?: SuggestOptions): string[];
}
interface SuggestOptions {
  limit?: number; // default 3
}
```

## The built-in predictor

```ts showLineNumbers
import { StaticDictionaryPredictor } from 'react-native-keyboard-bridge';

const predictor = new StaticDictionaryPredictor(['hello', 'help', 'helm', 'held', 'hero']);
predictor.suggest('hel');            // ['held', 'help', 'helm'] — limit defaults to 3
predictor.suggest('hel', { limit: 5 }); // all four 'hel'-prefixed words
```

Matching is case-insensitive prefix match, ranked shortest-then-alphabetical — a deliberately
simple baseline, not the ceiling of what's possible.

## A suggestion bar, wired to real typing

```tsx showLineNumbers
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText, StaticDictionaryPredictor } from 'react-native-keyboard-bridge';

const WORDS = ['hello', 'help', 'helm', 'held', 'hero', 'here', 'her'];

export default function KeyboardApp() {
  const predictor = useMemo(() => new StaticDictionaryPredictor(WORDS), []);
  const [current, setCurrent] = useState('');
  const suggestions = predictor.suggest(current);

  function pressLetter(letter: string) {
    commitText(letter);
    setCurrent((word) => word + letter);
  }

  function pressSpace() {
    commitText(' ');
    setCurrent('');
  }

  function acceptSuggestion(word: string) {
    if (current.length > 0) {
      deleteSurroundingText(current.length, 0); // erase the in-progress prefix
    }
    commitText(word + ' ');
    setCurrent('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.suggestionBar}>
        {suggestions.length === 0 ? (
          <Text style={styles.suggestionPlaceholder}>—</Text>
        ) : (
          suggestions.map((word) => (
            <TouchableOpacity key={word} onPress={() => acceptSuggestion(word)} style={styles.suggestion}>
              <Text style={styles.suggestionText}>{word}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      {/* letter rows call pressLetter(letter); the space key calls pressSpace() */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#d1d5db' },
  suggestionBar: { flexDirection: 'row', height: 36, alignItems: 'center', paddingHorizontal: 8 },
  suggestion: { paddingHorizontal: 10 },
  suggestionText: { fontWeight: '600', color: '#2563eb' },
  suggestionPlaceholder: { color: '#9ca3af' },
});
```

The pattern: track the in-progress word locally (`current`), derive `suggestions` from it on every
render, and on tap, erase exactly the characters typed so far (`deleteSurroundingText(current.length, 0)`)
before committing the accepted word plus a trailing space. `current` resets on space, punctuation,
or an accepted suggestion — the same word-boundary handling any predictive keyboard needs.

## Composes with swipe input, not just typing

Feed the same `current` state from [`keysAlongPath`](./swipe-typing)'s result instead of individual
key presses, and the suggestion bar becomes swipe-correction: the joined letters a finger crossed
become the `prefix` argument, and the ranked suggestions become the *corrected* words a fuzzy swipe
was probably aiming for.

**Next:** [Native feel](./feel-and-polish) — haptics, click sounds, and auto-capitalization.
