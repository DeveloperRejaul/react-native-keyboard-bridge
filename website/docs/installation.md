---
sidebar_position: 2
---

# Installation

```bash
yarn add react-native-keyboard-bridge
# or
npm install react-native-keyboard-bridge
```

## Android setup

Almost nothing to do:

1. Write your keyboard component and register it under the fixed name `KeyboardApp`, in your
   app's `index.js`, alongside your app's own component (see [Your host app](#your-host-app-apptsx)
   below for the full picture):
   ```js
   import { AppRegistry } from 'react-native';
   import KeyboardApp from './src/keyboard/KeyboardApp';
   AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
   ```
2. Add your keyboard's own branding — every app names its own keyboard and declares its own
   language subtypes, so these two small resources are still yours to supply:
   - `android/app/src/main/res/values/strings.xml` — a `keyboard_service_label` string.
   - `android/app/src/main/res/xml/method.xml` — an `<input-method>` with your subtype(s).

The `<service>` declaration itself, and the native module registration, are wired in automatically
via Android's manifest merging and React Native's autolinking — no `AndroidManifest.xml` or
`MainApplication.kt` edits needed.

## iOS setup

Apple requires a custom keyboard to live in its own Xcode **App Extension** target — no install
step can create that invisibly, so this needs two manual steps:

```bash
cd your-app
npx react-native-keyboard-bridge setup-ios
```

This creates (or refreshes) the extension target, wires up this package's Swift sources, scaffolds
a starter `Info.plist` you can rename/brand, and — since the extension runs real React Native —
checks whether its Podfile target has a `use_react_native!` block yet. If not, it prints the exact
snippet to add (Podfiles are hand-maintained Ruby, so this package won't rewrite yours for you):

```ruby showLineNumbers
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

`build-keyboard` wraps the standard `react-native bundle` CLI — re-run it whenever your keyboard
component changes for a release build (see [Live Reload](./live-reload) for the development loop).

## Your host app: `App.tsx`

`index.js` registers **two** separate components from the same entry point: your app's own screen
(`App`, whatever you already call it) and the keyboard (`KeyboardApp`, the fixed name). They're
independent — `App` is what the user sees when they open your app normally; `KeyboardApp` is what
renders inside the keyboard extension/IME process. Neither imports the other.

```js showLineNumbers title="index.js"
import { AppRegistry } from 'react-native';
import App from './App';
import KeyboardApp from './src/keyboard/KeyboardApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
```

Neither Android nor iOS lets an app silently turn on a keyboard for the user — `App.tsx` is where
you guide them through it, and where you'd put a real text field to try the keyboard out
immediately after enabling it. This is a complete, working host screen — the same one used by this
library's own example app:

```tsx showLineNumbers title="App.tsx"
import { useEffect, useState } from 'react';
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import {
  isKeyboardEnabled,
  openInputMethodSettings,
  showInputMethodPicker,
} from 'react-native-keyboard-bridge';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    isKeyboardEnabled().then(setEnabled);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Text style={styles.title}>My App</Text>
      <Text style={styles.hint}>
        {enabled
          ? 'Switch to "My Custom Keyboard" below, then type in the field.'
          : 'Enable "My Custom Keyboard" below, switch to it, then type in the field.'}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          title="Enable keyboard"
          onPress={() => {
            openInputMethodSettings();
            // The user comes back from Settings into this same screen — refresh
            // once they do, so the hint text and button below update themselves.
            isKeyboardEnabled().then(setEnabled);
          }}
        />
        <Button title="Switch keyboard" onPress={showInputMethodPicker} />
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type here…"
        multiline
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});

export default App;
```

- `isKeyboardEnabled()` drives the hint text and lets you hide the "Enable" step once it's already
  done — **Android only**; it always resolves `false` on iOS (there's no API for a containing app
  to query this there), so the copy above is written to still make sense either way.
- `showInputMethodPicker()` opens the system keyboard-switcher sheet directly — **Android only**;
  a safe no-op on iOS, since Apple exposes no equivalent picker API to third-party apps.
- The `TextInput` at the bottom is what makes this screen actually useful for testing: build,
  install, tap "Enable keyboard," switch to it, and type directly into this same screen to confirm
  end to end that your keyboard commits real text.

For a fuller, three-state version of this screen (a distinct "already active" state, not just
enabled-vs-not) — see [Tutorial: Let Users Enable It](./tutorial/settings-screen).
