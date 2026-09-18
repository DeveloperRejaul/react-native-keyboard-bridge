import type { Key, KeyRow } from './types';

/** Axis-aligned bounding box of a rendered key, in "standard key" units. */
export interface KeyGeometry {
  key: Key;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Lays out `rows` on a grid where each row is `rowHeight` units tall and
 * each key's width is in multiples of a standard key (see `Key.width`).
 * Pure/deterministic — used by both the gesture matcher and (eventually)
 * layout preview rendering.
 */
export function computeGeometry(rows: KeyRow[], rowHeight = 1): KeyGeometry[] {
  const geometry: KeyGeometry[] = [];
  rows.forEach((row, rowIndex) => {
    let cursor = 0;
    const y0 = rowIndex * rowHeight;
    const y1 = y0 + rowHeight;
    for (const key of row.keys) {
      const x0 = cursor;
      const x1 = cursor + key.width;
      geometry.push({ key, x0, x1, y0, y1 });
      cursor = x1;
    }
  });
  return geometry;
}
