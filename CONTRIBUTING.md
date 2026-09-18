# Contributing to react-native-custom-keyboard

Thanks for considering a contribution. This project lets developers build a
mobile system keyboard using ordinary React Native components — see the
[README](README.md) for what it does and [`docs/adr/`](docs/adr/) for why it's
built the way it is. Read the relevant ADR before changing anything about the
Android/iOS rendering strategy; those decisions were made deliberately and
revisiting them is welcome, but should be a conscious choice, not an
accident.

If you're an AI coding agent working in this repository, read
[`AGENTS.md`](AGENTS.md) first — it's the binding rulebook for automated
contributions here.

## Project layout

```
packages/react-native/   The only published package (react-native-custom-keyboard):
                          JS bridge/settings/gestures/prediction, the Android
                          native module (android/), the iOS native module +
                          setup CLI (ios/, bin/)
example/                 Demo app + the reference keyboard implementation
docs/adr/                Architecture Decision Records
docs/api.md              Public API reference
```

## Getting set up

```bash
git clone <this repo>
cd react-native-custom-keyboard
yarn install
yarn build   # compiles packages/react-native
yarn test    # runs its Jest suite
yarn lint    # lints it
```

To exercise changes against the example app:

```bash
# Android (from example/android, after `yarn install` at the repo root)
./gradlew :app:assembleDebug

# iOS (from example/ios)
bundle install
bundle exec pod install
xcodebuild -workspace CustomKeyboardExample.xcworkspace -scheme CustomKeyboardExample \
  -sdk iphonesimulator build

# Regenerate the example's compiled iOS keyboard bundle after editing
# example/src/keyboard/KeyboardApp.tsx (from the repo root):
node packages/react-native/bin/cli.js build-keyboard \
  example/src/keyboard/KeyboardApp.tsx \
  example/ios/CustomKeyboardExtension/KeyboardApp.compiled.js

# Regenerate the example's Xcode extension target after changing
# packages/react-native/ios's Swift sources:
node packages/react-native/bin/cli.js setup-ios example/ios
```

## Making changes

- **TypeScript**: strict mode, no `any` without a `// TODO(reason)` comment.
  Every public export from `packages/react-native/src/index.ts` needs a TSDoc
  comment and an entry in `docs/api.md`.
- **Kotlin**: standard Android Kotlin style, one class per file;
  `CustomKeyboardService` must never do heavy work on the main/UI thread.
- **Swift**: Swift API Design Guidelines; keep `DynamicViewRenderer` free of
  business logic — it only maps the JS-produced element tree to views.
- Add or update tests for anything you change (`yarn test` must stay green).
  Don't mark a PR ready if you haven't run the relevant test suite.
- If your change touches the compiler, either native module, or the
  Android/iOS rendering strategy in a way future contributors should know the
  reasoning behind, add a short ADR under `docs/adr/`.
- Don't restructure `packages/` layout without updating `AGENTS.md` in the
  same commit.
- Never add telemetry/analytics that phones home from inside the keyboard
  extension without explicit maintainer approval — a keyboard sees everything
  the user types, so privacy here is not optional.

## Pull requests

1. Keep PRs focused — one logical change per PR is easier to review than a
   bundle of unrelated ones.
2. Make sure it builds on both the Android and iOS example apps.
3. Update `docs/api.md` for any public API change.
4. Run `yarn lint` with no new warnings.
5. Describe *why* the change is needed, not just what it does — the commit
   message and PR description are where that reasoning should live, not
   left implicit.

## Reporting bugs / requesting features

Open a GitHub issue. Include your React Native version, platform (Android/
iOS) and version, and a minimal reproduction if you can — for keyboard
extensions specifically, a reproduction is often the fastest way to tell
whether something is a bug in this library or a platform restriction (see
`docs/api.md`'s bridge-function parity table for known Android/iOS
differences before filing).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating, you're expected to uphold it.
