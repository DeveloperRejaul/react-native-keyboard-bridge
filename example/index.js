/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import KeyboardApp from './src/keyboard/KeyboardApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
// Rendered inside CustomKeyboardService's own ReactRootView (src/android) —
// see docs/adr/ADR-003-android-ime-standalone-bridge.md.
AppRegistry.registerComponent('KeyboardApp', () => KeyboardApp);
