---
slug: one-package-to-rule-them-all
title: "How to Package a React Native Library with Native Android and iOS Modules"
description: "How react-native-keyboard-bridge consolidated four separate packages into a single npm install — real lessons on packaging native modules, autolinking, and monorepo layout."
keywords: [react native library architecture, npm package with native modules, react native autolinking, react native monorepo structure, publish react native library]
authors: [rejaul]
tags: [architecture, monorepo, react-native]
---

Early on, this library was four separate workspace packages: a `core` package (gestures/
prediction/layout types), a raw Gradle module wired in through a hand-edited `settings.gradle`, a
Swift-sources-plus-Ruby-script package hardcoded to one example project's paths, and the actual
published `react-native-keyboard-bridge` npm package. A real external consumer would have needed
two npm installs, a git submodule or hand-copy for the native folders, and manual edits across
`settings.gradle`, `app/build.gradle`, `MainApplication.kt`, and `AndroidManifest.xml`.

{/* truncate */}

## The end goal was one command

```bash
yarn add react-native-keyboard-bridge
```

Everything folds into that single package now: the JS bridge/settings functions, gestures,
layouts, word prediction, the Android native module (`android/`), the iOS native module and setup
CLI (`ios/`, `bin/`). Two real bugs got fixed in the process of merging, not just files moved
around:

1. Android's `<service>` declaration for `CustomKeyboardService` used to live only in the example
   app's own manifest, hardcoded with that app's own package name. It now lives in the library's
   own manifest, using a Gradle placeholder resolved to *the consuming app's* applicationId at
   merge time — verified by inspecting the actual merged manifest output.
2. The host-app-facing native module needed a manual `MainApplication.kt` line before; it's now
   declared as this dependency's autolinked `packageInstance` in `react-native.config.js`.

## iOS still can't be a zero-step install — and that's fine

This is an Apple platform constraint, not a gap in the library: a custom keyboard requires its own
Xcode App Extension target, and no CocoaPod or npm install can fabricate a new Xcode target from
outside Xcode's own project file format. `setup_xcode_targets.rb` handles the one step that
genuinely can't be automated away — discovering the consumer's own `.xcodeproj`, its app target,
and its bundle identifier, all without a single hardcoded path to any specific project name.

## A second flattening, later

Even after the four-package merge, the published package still lived nested two levels deep —
`packages/react-native/`, with its own inner `src/` folder for pure TypeScript. Since there's only
ever been one package since the consolidation, that nesting stopped serving a purpose. It's since
been flattened to `src/` at the repo root, with the inner TypeScript folder renamed to `core/` — a
purely mechanical rename, verified with a full rebuild on both platforms, that finally makes the
repo's layout match what a "one package" library should look like on disk, not just in
`package.json`.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

