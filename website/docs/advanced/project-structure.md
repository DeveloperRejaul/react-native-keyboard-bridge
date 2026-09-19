---
sidebar_position: 1
title: "1. Project Structure"
---

# Project Structure

The [Tutorial](../tutorial/basic-keyboard) builds everything in one file to keep each step easy to
follow. A real, shippable keyboard is usually worth splitting up — not because the library asks
for it, but because "one big `KeyboardApp.tsx`" gets hard to navigate once you have multiple
language layouts, gesture handling, prediction, and native-feel polish all in the same place.

There's nothing library-specific about this structure — it's just ordinary React Native project
organization, applied to a keyboard. `KeyboardApp` is still the one fixed name you register; only
its *contents* are what change shape.

## A recommended layout

```
src/keyboard/
  layouts/
    types.ts            # KeyRow[] data for each language — no rendering, no logic
    en.ts
    bn.ts
    index.ts            # { en, bn } map + the Language union type
  components/
    KeyButton.tsx        # one reusable key: label, press handler, style variants
    KeyboardRow.tsx       # renders one KeyRow as a row of KeyButtons
    SuggestionBar.tsx      # the word-prediction suggestion row
  hooks/
    useAutoCapitalize.ts   # wraps getCursorCapsMode
    useKeyFeedback.ts      # wraps performHapticFeedback + playClickSound
    useSuggestions.ts       # wraps StaticDictionaryPredictor + in-progress word tracking
  dictionary/
    en.ts                  # word list for the English predictor
  KeyboardApp.tsx           # composition root — wires layouts + components + hooks together
```

## Why split it this way

**Layouts are data, not components.** `layouts/en.ts` and `layouts/bn.ts` export plain `KeyRow[]`
arrays — the same shape [`keysAlongPath`](../tutorial/swipe-typing) consumes for gesture matching.
Keeping them as data (not JSX) means you can unit test a layout's structure, generate it
programmatically, or even load it from a config file later, without touching any rendering code.

**Hooks own the cross-cutting behavior.** Auto-capitalization, haptics/sound, and word prediction
each need to react to typing regardless of *which* language layout is active. Extracting them into
hooks (`useAutoCapitalize`, `useKeyFeedback`, `useSuggestions`) means `KeyboardApp.tsx` composes
behavior instead of implementing it inline — and each hook is independently testable.

**Components stay dumb.** `KeyButton` doesn't know about `commitText` or bridge functions at all —
it just renders a label and calls an `onPress` prop. All the bridge calls live in
`KeyboardApp.tsx`, the one place that actually needs to know this is a keyboard and not a generic
button grid.

**The dictionary is swappable.** `dictionary/en.ts` is just a `string[]` passed into
`StaticDictionaryPredictor`. Separating it means replacing it with a larger word list, a
frequency-weighted source, or a different `WordPredictor` implementation entirely
touches one file, not your component tree.

## What doesn't need to move

Don't over-extract. A single-language keyboard with no prediction or gestures is genuinely fine as
one file — this structure earns its complexity once you have *multiple* language layouts, or
you're combining several of the tutorial's features (gestures **and** prediction **and** polish)
in the same app. Reach for it when the single-file version starts feeling hard to navigate, not
before.

**Next:** [A complete, production-style KeyboardApp](./production-keyboard-app) — the full code for
every file above.
