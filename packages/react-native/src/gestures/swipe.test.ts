import { keysAlongPath } from './swipe';
import type { KeyRow } from '../layouts/types';

const rows: KeyRow[] = [
  {
    keys: [
      { id: 'q', label: 'q', width: 1, action: 'insertChar' },
      { id: 'w', label: 'w', width: 1, action: 'insertChar' },
      { id: 'e', label: 'e', width: 1, action: 'insertChar' },
    ],
  },
];

describe('keysAlongPath', () => {
  it('returns the ordered, de-duplicated keys a path passes over', () => {
    const path = [
      { x: 0.2, y: 0.5 }, // q
      { x: 0.4, y: 0.5 }, // still q
      { x: 1.5, y: 0.5 }, // w
      { x: 2.8, y: 0.5 }, // e
    ];
    const keys = keysAlongPath(rows, path);
    expect(keys.map((k) => k.id)).toEqual(['q', 'w', 'e']);
  });

  it('ignores points outside every key', () => {
    const path = [
      { x: -5, y: -5 },
      { x: 0.2, y: 0.5 }, // q
    ];
    const keys = keysAlongPath(rows, path);
    expect(keys.map((k) => k.id)).toEqual(['q']);
  });

  it('collapses a path that revisits the same key', () => {
    const path = [
      { x: 0.1, y: 0.5 },
      { x: 1.5, y: 0.5 }, // w
      { x: 0.1, y: 0.5 }, // back to q
    ];
    const keys = keysAlongPath(rows, path);
    expect(keys.map((k) => k.id)).toEqual(['q', 'w', 'q']);
  });
});
