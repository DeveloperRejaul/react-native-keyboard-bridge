# Changelog

All notable changes to `react-native-keyboard-bridge` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-28

Initial release.

### Added

- JS bridge (`commitText`, `deleteSurroundingText`, `setSelection`, and the
  full `InputConnection`/`UITextDocumentProxy`-backed API surface) — see
  `docs/api.md`.
- Android native module: `CustomKeyboardService` hosts a real, live React
  Native (New Architecture) runtime inside the IME process, autolinked with
  zero manual native wiring.
- iOS native module: `RNKeyboardBootstrap`/`KeyboardBridgeModule` host the
  same real React Native runtime (Hermes + JSI + Fabric) inside the Custom
  Keyboard Extension process — see ADR-008.
- `npx react-native-keyboard-bridge setup-ios` / `build-keyboard` CLI for the
  one-time Xcode extension target setup and JS bundling iOS requires.
- Gesture/swipe-typing engine and word-prediction interfaces
  (`computeGeometry`, `keysAlongPath`, `WordPredictor`,
  `StaticDictionaryPredictor`).
- DEBUG-only Metro live reload for `KeyboardApp.tsx` on both platforms —
  see ADR-009.
- Full documentation site with an installation guide, a 6-part tutorial, an
  API reference, and an advanced section covering production project
  structure and user-configurable settings/theming.

[Unreleased]: https://github.com/DeveloperRejaul/react-native-keyboard-bridge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DeveloperRejaul/react-native-keyboard-bridge/releases/tag/v0.1.0
