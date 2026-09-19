import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-keyboard-bridge';

/**
 * Rendered as the `KeyboardApp` RN component, mounted by
 * `CustomKeyboardService` (packages/react-native/android) inside its own `ReactRootView`.
 *
 * Written entirely by hand — plain `View`/`Text`/`TouchableOpacity`, this
 * app's own row data, this app's own shift state — to demonstrate that the
 * library imposes no schema at all. The only thing that comes from
 * `react-native-keyboard-bridge` is the raw bridge:
 * `commitText`/`deleteSurroundingText`. No `KeyLayout`, no `Key`, no
 * `CustomKeyboard` component required.
 */
const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function KeyboardApp(): React.JSX.Element {
  const [shift, setShift] = useState(false);

  function pressLetter(letter: string): void {
    commitText(shift ? letter.toUpperCase() : letter);
    if (shift) setShift(false);
  }

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {rowIndex === 2 && (
            <TouchableOpacity
              style={[styles.key, styles.wideKey, shift && styles.keyActive]}
              onPress={() => setShift((s) => !s)}
            >
              <Text style={styles.keyLabel}>⇧</Text>
            </TouchableOpacity>
          )}
          {row.map((letter) => (
            <TouchableOpacity key={letter} style={styles.key} onPress={() => pressLetter(letter)}>
              <Text style={styles.keyLabel}>{shift ? letter.toUpperCase() : letter}</Text>
            </TouchableOpacity>
          ))}
          {rowIndex === 2 && (
            <TouchableOpacity
              style={[styles.key, styles.wideKey]}
              onPress={() => deleteSurroundingText(1, 0)}
            >
              <Text style={styles.keyLabel}>⌫</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.key, styles.spaceKey]} onPress={() => commitText(' ')}>
          <Text style={styles.keyLabel}>space</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.key, styles.wideKey]} onPress={() => commitText('\n')}>
          <Text style={styles.keyLabel}>⏎</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#012c82',
    paddingVertical: 4,

  },
  row: {
    flexDirection: 'row',
  },
  key: {
    flex: 1,
    marginHorizontal: 2,
    marginVertical: 3,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyActive: {
    backgroundColor: '#a9b4c0',
  },
  wideKey: {
    flex: 1.5,
  },
  spaceKey: {
    flex: 5,
  },
  keyLabel: {
    fontSize: 16,
    color: '#1c1c1e',
  },
});
