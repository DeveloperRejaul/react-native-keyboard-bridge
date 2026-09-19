# ADR-006: Consolidate into a single published package

## Status
Accepted.

## Context
Before this ADR, the library was four separate workspace packages: `@react-native-keyboard-bridge/core`
(gestures/prediction/layout types/the iOS compiler), `packages/android` (raw Gradle module, not an
npm package at all — wired into `example/android` via a hand-edited `settings.gradle`
`project(':customkeyboard-android')` reference), `packages/ios` (Swift sources + a Ruby script
hardcoded to `example/ios/CustomKeyboardExample.xcodeproj`'s exact paths/target names), and
`react-native-keyboard-bridge` (the actual published npm package — just the JS bridge/settings
functions). A real external consumer would have needed to: install two npm packages, hand-copy or
git-submodule `packages/android`/`packages/ios`, manually edit their `settings.gradle`/
`app/build.gradle`/`MainApplication.kt`/`AndroidManifest.xml`, and hand-run a script that only
understood this repository's own file layout. The maintainer asked for one end result: `yarn add
react-native-keyboard-bridge` as the *only* install step.

## Decision
Everything folds into the single `react-native-keyboard-bridge` package:
- `core/` (renamed from `src/` by ADR-010) — the JS bridge/settings functions (unchanged) plus
  gestures/layouts/prediction (formerly `@react-native-keyboard-bridge/core`).
- `core/compiler/miniReactBundle.ts` (`bundleKeyboardApp`) — moved in too, compiled with its own
  `tsconfig.compiler.json` (CommonJS output, since it's `require()`d by `bin/cli.js`, a plain Node
  script — never by Metro) instead of the main `tsconfig.json` (ES2020 modules, for Metro). Still
  never re-exported from `core/index.ts` (unchanged rule from ADR-005 — pulling `@babel/core` into
  an app's Metro graph breaks bundling).
- `android/` — the former `packages/android`'s Gradle module, unchanged in content except two
  fixes made while moving it (see below): now a normal autolinked Android library dependency.
- `ios/` — the former `packages/ios`'s Swift/JS sources plus a **generalized**
  `setup_xcode_targets.rb` (see below).
- `bin/cli.js` — new. `npx react-native-keyboard-bridge setup-ios [iosDir]` and
  `build-keyboard <entry> <outFile>` are the only commands a consumer ever runs by hand.

**Two real bugs fixed while moving `packages/android`, not just a file move:**
1. Its `AndroidManifest.xml` was previously empty — the `<service>` declaration for
   `CustomKeyboardService` lived only in `example/android`'s own manifest, hardcoded with
   `example`'s own package name in `android:settingsActivity`. Moved into the library's manifest
   using the `${applicationId}.MainActivity` Gradle placeholder (substituted with *the consuming
   app's* applicationId at manifest-merge time) instead — verified via a clean
   `./gradlew :app:assembleDebug` that the merged manifest contains the `<service>` block with the
   placeholder correctly resolved to `com.customkeyboard.example.MainActivity`, with **zero**
   `<service>` declaration in `example`'s own manifest anymore.
2. `KeyboardSettingsPackage` (the host-app-only native module — see docs/api.md) required a manual
   `add(KeyboardSettingsPackage())` line in `MainApplication.kt`. Replaced with a
   `react-native.config.js` declaring it as this dependency's autolinking `packageInstance` —
   verified by checking the generated `PackageList.java` contains
   `new com.reactnativecustomkeyboard.KeyboardSettingsPackage()` with **no** manual line in
   `MainApplication.kt`. `KeyboardBridgePackage` (the IME-only one) is deliberately *not*
   autolinked this way — `CustomKeyboardService.kt` already constructs its own standalone
   `ReactHost` with it directly; autolinking only supports one auto-instantiated package per
   dependency, and the host app's `ReactHost` must never see `KeyboardBridgePackage`.

**What Android still can't avoid, and why it's acceptable:** `res/xml/method.xml` (keyboard
subtypes/locales) and `res/values/strings.xml`'s `keyboard_service_label` (the keyboard's display
name) stay app-owned, not merged from the library — every app's keyboard has its own name and
supports its own set of languages; there's no sensible library-wide default for either.

**iOS cannot become a zero-step install — this is an Apple platform constraint, not a gap in this
package.** A custom keyboard requires a distinct App Extension target in the host app's Xcode
project; no CocoaPod or npm install can fabricate a new Xcode target from outside Xcode's own
project file format. `setup_xcode_targets.rb` (already existing, from ADR-005) was generalized to
make that one remaining step a single command instead of a repo-specific script:
- Project/app-target/bundle-identifier are now discovered (`Dir.glob('*.xcodeproj')`, the target
  whose `product_type` is `com.apple.product-type.application`, that target's own
  `PRODUCT_BUNDLE_IDENTIFIER`) instead of hardcoded to `CustomKeyboardExample`.
- The shared-source group's path is computed relative to the discovered `.xcodeproj`, from the
  script's own `__dir__` — correct whether this package sits in `node_modules` (a real install) or
  is symlinked in via a workspace (this repo's own `example`).
- The extension's `Info.plist`/`KeyboardApp.compiled.js` are scaffolded automatically on first run
  if the app-owned `ios/CustomKeyboardExtension/` folder doesn't have them yet, so `setup-ios`
  alone produces a working (if unbranded) extension.
- Verified by running `node bin/cli.js setup-ios` (via the package's own `bin/cli.js`, exactly as
  an external consumer would invoke it — nothing in the invocation path or the script itself
  references `example` by name) against `example/ios`, then a full `xcodebuild` — succeeded, and
  the built `.appex`'s bundled `mini-react-runtime.js`/`KeyboardApp.compiled.js` are byte-identical
  to source, same as ADR-005's original verification.

## Consequences
- `packages/core`, `packages/android`, `packages/ios` no longer exist as separate directories —
  everything under one package (`src/`, per ADR-010; its inner pure-TS folder is `core/`).
- `scripts/build-ios-keyboard-bundle.js` (a repo-specific wrapper) is deleted — its job is now
  `bin/cli.js`'s `build-keyboard` command, which this repo's own `example` uses the same way any
  external consumer would (`node ../src/bin/cli.js build-keyboard ...`, or
  `npx react-native-keyboard-bridge build-keyboard ...` once actually installed from npm).
- `@babel/core`/`@babel/preset-typescript`/`@babel/plugin-transform-react-jsx` moved from
  `devDependencies` to real `dependencies` — they now ship to every consumer (via `bin/cli.js`),
  not just this repo's own build. This is intentional and necessary, not a regression of ADR-005's
  concern: they're only ever `require()`d from `bin/cli.js`, a plain Node script Metro never
  bundles, same guarantee as before.
- `@babel/parser`/`@babel/traverse`/`@babel/types` — leftover dependencies of the old
  `compileKeyboardSource` compiler (removed from `@react-native-keyboard-bridge/core` in an
  earlier pass this session) — were still listed in that package's `package.json` with nothing
  importing them. Dropped during the merge rather than carried into the consolidated
  `package.json`.
- Known gap, unchanged from ADR-005: no XCTest coverage for `DynamicViewRenderer`/
  `JSKeyboardRuntime`; `miniReactBundle.test.ts` and static binary inspection remain the
  verification surface for the iOS side.
