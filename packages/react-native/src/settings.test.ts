import { NativeModules } from 'react-native';
import {
  isKeyboardEnabled,
  isKeyboardSelected,
  openInputMethodSettings,
  showInputMethodPicker,
} from './settings';

describe('settings', () => {
  const native = NativeModules.KeyboardSettings as Record<string, jest.Mock>;

  beforeEach(() => {
    Object.values(native).forEach((fn) => fn.mockClear());
  });

  it('forwards openInputMethodSettings to the native module', () => {
    openInputMethodSettings();
    expect(native.openInputMethodSettings).toHaveBeenCalled();
  });

  it('forwards showInputMethodPicker to the native module', () => {
    showInputMethodPicker();
    expect(native.showInputMethodPicker).toHaveBeenCalled();
  });

  it('forwards isKeyboardEnabled to the native module and returns its result', async () => {
    native.isKeyboardEnabled.mockResolvedValue(true);
    await expect(isKeyboardEnabled()).resolves.toBe(true);
  });

  it('forwards isKeyboardSelected to the native module and returns its result', async () => {
    native.isKeyboardSelected.mockResolvedValue(false);
    await expect(isKeyboardSelected()).resolves.toBe(false);
  });
});
