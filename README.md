# react-native-keyboard-bridge

[![npm version](https://img.shields.io/npm/v/react-native-keyboard-bridge.svg)](https://www.npmjs.com/package/react-native-keyboard-bridge)
[![npm downloads](https://img.shields.io/npm/dm/react-native-keyboard-bridge.svg)](https://www.npmjs.com/package/react-native-keyboard-bridge)
[![CI](https://github.com/DeveloperRejaul/react-native-keyboard-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/DeveloperRejaul/react-native-keyboard-bridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Build a mobile system keyboard (an Android IME / iOS Custom Keyboard
Extension) out of ordinary React Native components — `View`, `Text`,
`TouchableOpacity`, JSX, `useState` — instead of writing native UI for each
platform. You write **one** hand-written component; it runs live on both.

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

export default function KeyboardApp() {
  const [shifted, setShifted] = useState(false);
  return (
    <View style={styles.row}>
      {['q', 'w', 'e', 'r', 't', 'y'].map((key) => (
        <TouchableOpacity key={key} onPress={() => commitText(shifted ? key.toUpperCase() : key)}>
          <Text style={styles.key}>{shifted ? key.toUpperCase() : key}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => deleteSurroundingText(1, 0)}>
        <Text style={styles.key}>⌫</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  key: { fontSize: 18, padding: 8 },
});
```

No schema, no config file, no proprietary layout DSL to learn — it's the
React Native you already know. Any language or script works: `commitText`
takes a plain Unicode string, so Bangla, Arabic, Devanagari, CJK, and
right-to-left layouts are all first-class, not an afterthought.

## Why this exists

Every other approach to a custom keyboard on React Native means dropping into
Kotlin and Swift and re-implementing your UI twice, natively, by hand. This
library hosts a **real, live** React Native runtime — Hermes + JSI + Fabric —
inside both the Android IME process and iOS's Custom Keyboard Extension (see
[ADR-008](docs/adr/ADR-008-ios-full-react-native.md), which superseded an
earlier, more restricted JavaScriptCore-based approach on iOS once testing
showed full RN works there too). One component, one runtime shape, so you
write it once.

## Install

```bash
yarn add react-native-keyboard-bridge
# or
npm install react-native-keyboard-bridge
```

That's the only package you install. Android, iOS, the JS bridge, gesture/
swipe-typing helpers, word prediction, and the iOS build tooling all ship in
this one package — see [`docs/adr/ADR-006-single-package-consolidation.md`](docs/adr/ADR-006-single-package-consolidation.md).

### Android setup

Almost nothing to do:
1. Write your keyboard component and register it under the fixed name
   `KeyboardApp`, in your app's `index.js`:
   ```js
   import { AppRegistry } from 'react-native';
   import KeyboardApp from './src/keyboard/KeyboardApp';
   AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
   ```
2. Add your keyboard's own branding — every app names its own keyboard and
   declares its own language subtypes, so these two small resources are still
   yours to supply:
   - `android/app/src/main/res/values/strings.xml` — a `keyboard_service_label` string.
   - `android/app/src/main/res/xml/method.xml` — an `<input-method>` with your subtype(s)
     (see `example/android/app/src/main/res/xml/method.xml` for a working example).

The `<service>` declaration itself, and the native module registration, are
wired in automatically via Android's manifest merging and React Native's
autolinking — no `AndroidManifest.xml` or `MainApplication.kt` edits needed.

### iOS setup

Apple requires a custom keyboard to live in its own Xcode **App Extension**
target — no install step can create that invisibly, so this needs two manual
steps:

```bash
cd your-app
npx react-native-keyboard-bridge setup-ios
```

This creates (or refreshes) the extension target, wires up this package's
Swift sources, scaffolds a starter `Info.plist` you can rename/brand, and —
since the extension runs real React Native — checks whether its Podfile
target has a `use_react_native!` block yet. If not, it prints the exact
snippet to add (Podfiles are hand-maintained Ruby, so this package won't
rewrite yours for you):

```ruby
target 'CustomKeyboardExtension' do
  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
```

Then install pods and build the JS bundle the extension loads:

```bash
bundle exec pod install
npx react-native-keyboard-bridge build-keyboard
```

`build-keyboard` wraps the standard `react-native bundle` CLI — re-run it
whenever your keyboard component changes.

### Developing with live reload

Editing your keyboard component doesn't require a rebundle-and-reinstall loop — DEBUG builds
connect to Metro like any other RN screen (see [ADR-009](docs/adr/ADR-009-dev-metro-live-reload.md)):

- **Android**: start Metro (`npx react-native start`), run `adb reverse tcp:8081 tcp:8081`
  (automatic if you use `react-native run-android`), and install a debug build. Nothing else to
  configure — this is standard React Native behavior.
- **iOS**: also start Metro, then, one time only: set `RequestsOpenAccess` to `true` in the
  extension's `Info.plist` (`NSExtension > NSExtensionAttributes`) and enable "Allow Full Access"
  for the keyboard in Settings — an extension has no network access without both. **Flip
  `RequestsOpenAccess` back to `false` before a release build**; it's a real permission prompt
  end users would otherwise see for no reason.

Release/production builds on both platforms always use a committed bundle — none of this affects
what ships.

### Enabling the keyboard (end users)

Neither Android nor iOS lets an app silently turn on a keyboard for the
user — from your app's own screen (an onboarding step, typically), guide them
there yourself:

```tsx
import { openInputMethodSettings, showInputMethodPicker } from 'react-native-keyboard-bridge';

<Button title="Enable keyboard" onPress={openInputMethodSettings} />
<Button title="Switch keyboard" onPress={showInputMethodPicker} /> {/* Android only */}
```

## How it works

| | Android | iOS |
|---|---|---|
| Runtime | Real React Native (New Architecture, `ReactHost`) hosted inside the IME process | Real React Native (New Architecture, `RCTReactNativeFactory`) hosted inside the extension process |
| Your component | Runs live, unmodified | Runs live, unmodified |
| Rendering | Fabric, same as any RN screen | Fabric, same as any RN screen |
| Text editing | `InputConnection`, via a native bridge module (`KeyboardBridgeModule.kt`) | `UITextDocumentProxy`, via a native bridge module (`KeyboardBridgeModule.swift`) |

Not every bridge function has an equivalent on both platforms — iOS's keyboard
extension API surface is smaller than Android's. See
[`docs/api.md`](docs/api.md)'s bridge-function parity table for exactly
which functions are fully supported, approximated, or Android-only (calling
an Android-only function on iOS is a safe no-op, never a crash).

Full reasoning for every architectural choice is in [`docs/adr/`](docs/adr/);
[`docs/api.md`](docs/api.md) is the complete public API reference.

## Status

Verified on real tooling, not just compiled:
- Core gesture/prediction engine: Jest (`yarn test`).
- Android: boots as live React Native (New Architecture `ReactHost`) and
  commits real text through `InputConnection`, verified on an emulator; the
  IME's manifest entry and native-module registration verified to merge in
  automatically via a clean Gradle build with zero manual wiring in the
  consuming app.
- iOS: the Custom Keyboard Extension builds and boots real React Native
  (Hermes + JSI + Fabric) — verified with a real Simulator run: the JS
  runtime thread reaches a normal idle steady state (checked via `lldb`), the
  hand-written component renders on screen, and typed keys commit real text
  through `textDocumentProxy` (screenshots + log inspection; see
  [ADR-008](docs/adr/ADR-008-ios-full-react-native.md)).
- The one-command `setup-ios`/`build-keyboard` CLI verified against a real
  consumer app (this repo's own `example/`), driven exactly the way an
  external project would use it.

Known gaps:
- No XCTest coverage yet for iOS's `RNKeyboardBootstrap`/`KeyboardBridgeModule`
  themselves — see [ADR-008](docs/adr/ADR-008-ios-full-react-native.md)'s
  "Consequences".
- No real-device memory verification for iOS yet — Simulator doesn't enforce
  Apple's actual extension memory ceiling, so this is the one open risk from
  moving iOS to full React Native. Test on a real device before shipping to
  production.

## Repo layout

```
src/                     The published package: JS bridge/settings/gestures/
                         prediction (core/), Android native module (android/),
                         iOS native module + setup CLI (ios/, bin/)
example/                 Demo app + the reference keyboard implementation
docs/adr/                Architecture Decision Records
docs/api.md              Public API reference
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Contributing

Bug reports, feature requests, and pull requests are welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md) for the development setup and PR
expectations. This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
