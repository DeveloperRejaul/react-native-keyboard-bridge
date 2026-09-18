(function () {
/**
 * Rendered as the `KeyboardApp` RN component, mounted by
 * `CustomKeyboardService` (packages/react-native/android) inside its own `ReactRootView`.
 *
 * Written entirely by hand — plain `View`/`Text`/`TouchableOpacity`, this
 * app's own row data, this app's own shift state — to demonstrate that the
 * library imposes no schema at all. The only thing that comes from
 * `react-native-custom-keyboard` is the raw bridge:
 * `commitText`/`deleteSurroundingText`. No `KeyLayout`, no `Key`, no
 * `CustomKeyboard` component required.
 */
const ROWS = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']];
function KeyboardApp() {
  const [shift, setShift] = useState(false);
  function pressLetter(letter) {
    commitText(shift ? letter.toUpperCase() : letter);
    if (shift) setShift(false);
  }
  return __h(View, {
    style: styles.container
  }, ROWS.map((row, rowIndex) => __h(View, {
    key: rowIndex,
    style: styles.row
  }, rowIndex === 2 && __h(TouchableOpacity, {
    style: [styles.key, styles.wideKey, shift && styles.keyActive],
    onPress: () => setShift(s => !s)
  }, __h(Text, {
    style: styles.keyLabel
  }, "\u21E7")), row.map(letter => __h(TouchableOpacity, {
    key: letter,
    style: styles.key,
    onPress: () => pressLetter(letter)
  }, __h(Text, {
    style: styles.keyLabel
  }, shift ? letter.toUpperCase() : letter))), rowIndex === 2 && __h(TouchableOpacity, {
    style: [styles.key, styles.wideKey],
    onPress: () => deleteSurroundingText(1, 0)
  }, __h(Text, {
    style: styles.keyLabel
  }, "\u232B")))), __h(View, {
    style: styles.row
  }, __h(TouchableOpacity, {
    style: [styles.key, styles.spaceKey],
    onPress: () => commitText(' ')
  }, __h(Text, {
    style: styles.keyLabel
  }, "space")), __h(TouchableOpacity, {
    style: [styles.key, styles.wideKey],
    onPress: () => commitText('\n')
  }, __h(Text, {
    style: styles.keyLabel
  }, "\u23CE"))));
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#012c82',
    paddingVertical: 4
  },
  row: {
    flexDirection: 'row'
  },
  key: {
    flex: 1,
    marginHorizontal: 2,
    marginVertical: 3,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  keyActive: {
    backgroundColor: '#a9b4c0'
  },
  wideKey: {
    flex: 1.5
  },
  spaceKey: {
    flex: 5
  },
  keyLabel: {
    fontSize: 16,
    color: '#1c1c1e'
  }
});
__mount(KeyboardApp);
})();