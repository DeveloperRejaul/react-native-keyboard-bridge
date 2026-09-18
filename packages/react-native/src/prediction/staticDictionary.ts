import type { SuggestOptions, WordPredictor } from './types';

const DEFAULT_LIMIT = 3;

/**
 * Minimal `WordPredictor` backed by a fixed, in-memory word list. Matches on
 * case-insensitive prefix, ranking shorter words first (closer to the typed
 * prefix), then alphabetically for a stable order.
 */
export class StaticDictionaryPredictor implements WordPredictor {
  private readonly words: string[];

  constructor(words: string[]) {
    this.words = words;
  }

  suggest(prefix: string, options?: SuggestOptions): string[] {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    if (prefix.length === 0) {
      return [];
    }
    const needle = prefix.toLowerCase();
    return this.words
      .filter((word) => word.toLowerCase().startsWith(needle))
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .slice(0, limit);
  }
}
