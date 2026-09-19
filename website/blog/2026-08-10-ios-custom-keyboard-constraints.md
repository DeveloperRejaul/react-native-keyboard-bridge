---
slug: ios-custom-keyboard-constraints
title: "What Can (and Can't) an iOS Custom Keyboard Extension Do?"
description: "A complete guide to iOS Custom Keyboard Extension limitations — what UITextDocumentProxy allows, why Full Access is required for network access, and what Apple simply doesn't permit."
keywords: [ios custom keyboard extension, uitextdocumentproxy, ios keyboard extension limitations, full access ios keyboard, ios keyboard extension api]
authors: [rejaul]
tags: [ios, platform, keyboard]
---

Apple's Custom Keyboard Extension API is deliberately narrow — narrower than most developers
expect coming from Android's `InputConnection`. Knowing the actual boundary up front saves you
from designing a feature the platform will simply never let you ship.

{/* truncate */}

## `UITextDocumentProxy` is the entire surface

Everything a keyboard extension can do to the host text field goes through
`UITextDocumentProxy`/`UIInputViewController` — there's no lower-level access, no
`InputConnection`-equivalent with dozens of methods. The
[bridge-function parity table](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/api/bridge-functions) exists precisely because this surface
is so much smaller than Android's:

- **Fully supported**: inserting text, reading text before/after the cursor, reading the current
  selection, advancing to the next input mode.
- **Approximated**: deleting *after* the cursor (no forward-delete API — `deleteSurroundingText`'s
  `after` argument is silently ignored on iOS), "switch to previous input method" (iOS has no
  distinct "previous," so it calls the same "next" API), cursor caps-mode (a heuristic over
  `documentContextBeforeInput`, not Android's exact locale-aware algorithm).
- **Not possible at all**: absolute-offset selection, key-event injection, generic "editor action"
  dispatch, marked/composing text, batch edits, or a keyboard dismissing itself.

None of these iOS-only gaps throw. Every function the library exposes is defined on both
platforms; the ones with no iOS equivalent are safe no-ops (or resolve a safe default value)
specifically so a shared `KeyboardApp.tsx` never needs an `if (Platform.OS === ...)` branch.

## Full Access is an explicit, visible user choice

Any network request from inside the extension process requires the user to grant "Allow Full
Access" in Settings — and that toggle only appears at all if the extension's `Info.plist` sets
`RequestsOpenAccess` to `true`. There's no way around this for anything that needs the network,
including connecting to a Metro dev server during development.

This library ships `RequestsOpenAccess: false` by default in the scaffolded `Info.plist` — a
production keyboard that has no other reason to need network access should ship with no reason to
prompt the user for it. Development is the one carve-out: flip it to `true` locally to get
[Metro live reload](https://developerrejaul.github.io/react-native-keyboard-bridge/blog/live-reload-for-keyboard-extensions), and flip it back before a release
build.

## Enabling a keyboard is always the user's decision

Neither platform lets an app silently register itself as active — `openInputMethodSettings` opens
this app's own Settings page on iOS (Apple exposes no deeper deep link than that), from which the
user still navigates to General > Keyboard > Keyboards themselves. There's no API for a containing
app to enable, switch to, or query the enabled/selected state of a keyboard on iOS the way Android
allows — see the [settings screen tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/tutorial/settings-screen) for how to design an
onboarding flow around that asymmetry instead of fighting it.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

