/**
 * react-native-custom-keyboard example app.
 * A minimal harness for exercising the custom keyboard end to end: type into
 * the TextInput below using the "Custom Keyboard" IME (enable it in system
 * settings, then switch to it from this field).
 *
 * @format
 */

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
import { isKeyboardEnabled, openInputMethodSettings, showInputMethodPicker } from 'react-native-custom-keyboard';

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
      <Text style={styles.title}>react-native-custom-keyboard</Text>
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
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
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
