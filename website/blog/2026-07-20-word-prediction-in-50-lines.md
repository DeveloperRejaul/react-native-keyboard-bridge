---
slug: word-prediction-in-50-lines
title: "How to Add Word Prediction to a React Native Keyboard"
description: "Add word prediction and autocomplete suggestions to a custom React Native keyboard using the pluggable WordPredictor interface — includes a full suggestion-bar example."
keywords: [word prediction react native, autocomplete keyboard react native, predictive text react native, custom keyboard suggestions, WordPredictor]
authors: [rejaul]
tags: [prediction, react-native, keyboard]
---

Word prediction doesn't need to be a black box. The library exposes it as one interface —
`WordPredictor` — with a minimal built-in implementation you can use as-is or replace entirely.

{/* truncate */}

## The interface

```ts showLineNumbers
interface WordPredictor {
  suggest(prefix: string, options?: SuggestOptions): string[];
}
interface SuggestOptions {
  limit?: number; // default 3
}
```

That's the entire contract: given what's been typed so far, return candidate completions. Nothing
in the bridge or the UI layer cares how `suggest` is implemented — frequency-weighted, ML-backed,
server-fetched, whatever your app needs.

## The built-in default

`StaticDictionaryPredictor` is deliberately small: an in-memory word list, case-insensitive prefix
match, ranked shortest-then-alphabetical.

```ts showLineNumbers
const predictor = new StaticDictionaryPredictor(['hello', 'help', 'helm', 'held']);
predictor.suggest('hel'); // ['held', 'help', 'helm'] — 'hello' cut off by the default limit of 3
predictor.suggest('hel', { limit: 5 }); // all four, same ranking
```

It's meant as a starting point and a reference implementation, not the ceiling of what's possible
— swap it for anything that satisfies `WordPredictor` once you need frequency weighting or a
larger vocabulary.

## Wiring it into a keyboard

```tsx showLineNumbers
const predictor = useMemo(() => new StaticDictionaryPredictor(WORDS), []);
const [current, setCurrent] = useState('');
const suggestions = predictor.suggest(current);

function press(letter: string) {
  commitText(letter);
  setCurrent((c) => c + letter);
}

function acceptSuggestion(word: string) {
  deleteSurroundingText(current.length, 0);
  commitText(word + ' ');
  setCurrent('');
}
```

The pattern: track the in-progress word locally (`current`), show `suggestions` in a bar above the
keys, and on tap, delete exactly what's been typed so far (`current.length` characters back) and
commit the full word instead. `current` resets on space, punctuation, or a suggestion tap — same
as any predictive keyboard's word-boundary handling.

This composes with everything else in the library: run it against the sequence
[`keysAlongPath`](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/swipe-to-type) returns from a swipe gesture, or against plain typed input
from tap-based keys. See the [word prediction tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/word-prediction) for the
complete suggestion-bar component.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

