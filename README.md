# react-native-custom-keyboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Build a mobile system keyboard (an Android IME / iOS Custom Keyboard
Extension) out of ordinary React Native components — `View`, `Text`,
`TouchableOpacity`, JSX, `useState` — instead of writing native UI for each
platform. You write **one** hand-written component; it runs live on both.

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-custom-keyboard';

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
library hosts a **real, live** React Native runtime inside the Android IME
process, and a **compiled** version of the same component inside iOS's Custom
Keyboard Extension (where Apple's tight extension memory ceiling rules out a
full RN runtime — see [ADR-001](docs/adr/ADR-001-ios-no-live-js-runtime.md)/
[ADR-005](docs/adr/ADR-005-ios-mini-js-runtime.md)). One component, two
runtimes, so you write it once.

## Install

```bash
yarn add react-native-custom-keyboard
# or
npm install react-native-custom-keyboard
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
target — no install step can create that invisibly, so this is the one
manual command iOS needs:

```bash
cd your-app
bundle exec pod install   # if you haven't already, for CocoaPods' xcodeproj gem
npx react-native-custom-keyboard setup-ios
npx react-native-custom-keyboard build-keyboard src/keyboard/KeyboardApp.tsx ios/CustomKeyboardExtension/KeyboardApp.compiled.js
```

`setup-ios` creates (or refreshes) the extension target, wires up this
package's Swift sources, and scaffolds a starter `Info.plist` you can rename/
brand. `build-keyboard` compiles your hand-written component into the plain
JS bundle the extension's embedded `JSContext` runs — re-run it whenever that
component changes.

### Enabling the keyboard (end users)

Neither Android nor iOS lets an app silently turn on a keyboard for the
user — from your app's own screen (an onboarding step, typically), guide them
there yourself:

```tsx
import { openInputMethodSettings, showInputMethodPicker } from 'react-native-custom-keyboard';

<Button title="Enable keyboard" onPress={openInputMethodSettings} />
<Button title="Switch keyboard" onPress={showInputMethodPicker} /> {/* Android only */}
```

## How it works

| | Android | iOS |
|---|---|---|
| Runtime | Real React Native (New Architecture, `ReactHost`) hosted inside the IME process | `JavaScriptCore` (system framework) running a small hand-rolled hooks + element-tree prelude |
| Your component | Runs live, unmodified | Compiled ahead of time to plain JS by `bundleKeyboardApp` |
| Rendering | Fabric, same as any RN screen | A small native `View`/`Text`/`TouchableOpacity` interpreter (`DynamicViewRenderer`) |
| Text editing | `InputConnection`, via a native bridge module | `UITextDocumentProxy`, via the same function names |

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
- iOS: the Custom Keyboard Extension builds, embeds `JavaScriptCore`, and
  runs the same hand-written component (compiled by `bundleKeyboardApp`) —
  verified by `miniReactBundle.test.ts` (the compiled bundle actually
  executes against a fake mini-runtime) and by building the extension target
  and statically inspecting the resulting binary.
- The one-command `setup-ios`/`build-keyboard` CLI verified against a real
  consumer app (this repo's own `example/`), driven exactly the way an
  external project would use it.

Known gap: no XCTest coverage yet for iOS's native `DynamicViewRenderer`/
`JSKeyboardRuntime` themselves — see
[ADR-005](docs/adr/ADR-005-ios-mini-js-runtime.md)'s "Consequences".

## Repo layout

```
packages/react-native/   The published package: JS bridge/settings/gestures/
                         prediction, Android native module (android/), iOS
                         native module + setup CLI (ios/, bin/)
example/                 Demo app + the reference keyboard implementation
docs/adr/                Architecture Decision Records
docs/api.md              Public API reference
```

## Contributing

Bug reports, feature requests, and pull requests are welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md) for the development setup and PR
expectations. This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
