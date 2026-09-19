import { computeGeometry } from './geometry';
import type { KeyRow } from './types';

const rows: KeyRow[] = [
  {
    keys: [
      { id: 'a', label: 'a', width: 1, action: 'insertChar' },
      { id: 'b', label: 'b', width: 2, action: 'insertChar' },
    ],
  },
  {
    keys: [{ id: 'c', label: 'c', width: 1, action: 'insertChar' }],
  },
];

describe('computeGeometry', () => {
  it('lays out keys left-to-right, stacking rows vertically', () => {
    const geometry = computeGeometry(rows);
    expect(geometry).toEqual([
      { key: rows[0].keys[0], x0: 0, x1: 1, y0: 0, y1: 1 },
      { key: rows[0].keys[1], x0: 1, x1: 3, y0: 0, y1: 1 },
      { key: rows[1].keys[0], x0: 0, x1: 1, y0: 1, y1: 2 },
    ]);
  });

  it('respects a custom row height', () => {
    const geometry = computeGeometry(rows, 2);
    expect(geometry[2]).toMatchObject({ y0: 2, y1: 4 });
  });
});
