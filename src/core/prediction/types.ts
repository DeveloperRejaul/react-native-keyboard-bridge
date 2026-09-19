/** Options accepted by a `WordPredictor.suggest` call. */
export interface SuggestOptions {
  /** Maximum number of suggestions to return. Defaults to 3. */
  limit?: number;
}

/**
 * Pluggable word-suggestion interface. This package ships a minimal
 * static-dictionary implementation (`StaticDictionaryPredictor`); apps can
 * supply their own (frequency-weighted, on-device ML, etc.) without touching
 * layout or gesture code.
 */
export interface WordPredictor {
  /** Returns suggested completions/corrections for the given text prefix, best first. */
  suggest(prefix: string, options?: SuggestOptions): string[];
}
