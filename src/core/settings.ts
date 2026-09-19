import { NativeModules } from 'react-native';

/**
 * Wraps the native `KeyboardSettings` module (see this package's `android/`
 * `KeyboardSettingsModule.kt` and `ios/KeyboardSettingsModule.swift`) — unlike
 * `./bridge`'s functions, these run from the *host app's own* screen (e.g. an onboarding step in
 * `App.tsx`), not from inside the keyboard itself, since enabling/switching a keyboard is
 * something only the app the user already has open can prompt them to do.
 *
 * iOS implements only `openInputMethodSettings` — Apple exposes no API for a containing app to
 * query whether its keyboard extension is enabled/selected, or to open the system chooser, the
 * way Android does (see docs/api.md's "Native modules > iOS" section). Every function here is
 * still safe to call on any platform: each one is individually optional-chained, so a method the
 * current platform's native module doesn't implement is a no-op (or resolves a safe default)
 * instead of throwing.
 */
interface KeyboardSettingsNativeModule {
  openInputMethodSettings?(): void;
  showInputMethodPicker?(): void;
  isKeyboardEnabled?(): Promise<boolean>;
  isKeyboardSelected?(): Promise<boolean>;
}

const native = NativeModules.KeyboardSettings as KeyboardSettingsNativeModule | undefined;

/**
 * Opens system Settings > Languages & input > On-screen keyboard, where the user turns this
 * keyboard's toggle on. Required once before it can be selected — an app cannot enable an IME
 * for the user, only take them to where they do it themselves (same as Gboard's own prompt).
 * On iOS this opens the app's own Settings page instead — the closest Apple allows — from which
 * the user still navigates to General > Keyboard > Keyboards themselves.
 */
export function openInputMethodSettings(): void {
  native?.openInputMethodSettings?.();
}

/**
 * Opens the system's "choose input method" chooser — the same dialog long-pressing the
 * space bar/globe key opens — so the user can switch to this keyboard. Only works once it's
 * already enabled (see `openInputMethodSettings`). Android only — iOS has no equivalent API for
 * a containing app; switching there only happens from inside the keyboard extension itself.
 */
export function showInputMethodPicker(): void {
  native?.showInputMethodPicker?.();
}

/** Resolves whether this keyboard is turned on in system settings (not necessarily the one
 * currently active — see `isKeyboardSelected`). Use to decide whether to still show an "Enable
 * keyboard" onboarding step. Android only — resolves `false` on iOS. */
export function isKeyboardEnabled(): Promise<boolean> {
  return native?.isKeyboardEnabled?.() ?? Promise.resolve(false);
}

/** Resolves whether this keyboard is the user's currently active default input method. Android
 * only — resolves `false` on iOS. */
export function isKeyboardSelected(): Promise<boolean> {
  return native?.isKeyboardSelected?.() ?? Promise.resolve(false);
}
