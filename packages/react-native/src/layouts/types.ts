/**
 * The set of built-in actions a key can trigger. Native modules on both
 * platforms (Android `KeyboardBridgeModule`, iOS `KeyboardViewController`)
 * interpret these same action names — see docs/api.md.
 */
export type KeyAction =
  | 'insertChar'
  | 'commitText'
  | 'deleteBackward'
  | 'toggleShift'
  | 'toggleSymbols'
  | 'switchLanguage'
  | 'space'
  | 'enter';

/** A single key on a keyboard row — the data shape `keysAlongPath` (gesture matching) returns. */
export interface Key {
  /** Stable identifier, unique within the row (e.g. "q", "shift"). */
  id: string;
  /** Text rendered on the key. */
  label: string;
  /** Relative width, in multiples of a standard key ("1" = one standard key). */
  width: number;
  /** What happens when the key is pressed. */
  action: KeyAction;
  /**
   * The character(s) committed for `insertChar`/`commitText` actions. Falls
   * back to `label` when omitted.
   */
  value?: string;
  /** Optional secondary label shown for long-press alternates (accents, etc.). */
  secondaryLabel?: string;
}

/** A horizontal row of keys. */
export interface KeyRow {
  keys: Key[];
}
