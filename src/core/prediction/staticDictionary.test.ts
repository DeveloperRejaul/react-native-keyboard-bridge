import { StaticDictionaryPredictor } from './staticDictionary';

describe('StaticDictionaryPredictor', () => {
  const predictor = new StaticDictionaryPredictor(['the', 'there', 'then', 'them', 'theme', 'cat']);

  it('suggests case-insensitive prefix matches, shortest first', () => {
    expect(predictor.suggest('the')).toEqual(['the', 'them', 'then']);
  });

  it('respects a custom limit', () => {
    expect(predictor.suggest('the', { limit: 1 })).toEqual(['the']);
  });

  it('returns no suggestions for an empty prefix', () => {
    expect(predictor.suggest('')).toEqual([]);
  });

  it('returns no suggestions when nothing matches', () => {
    expect(predictor.suggest('xyz')).toEqual([]);
  });
});
