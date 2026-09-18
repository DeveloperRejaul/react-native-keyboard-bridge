import type { Key, KeyRow } from '../layouts/types';
import { computeGeometry } from '../layouts/geometry';

/** A single sample point on a touch path, in the same units as key geometry. */
export interface TouchPoint {
  x: number;
  y: number;
}

function keyAt(geometry: ReturnType<typeof computeGeometry>, point: TouchPoint): Key | undefined {
  const hit = geometry.find(
    (g) => point.x >= g.x0 && point.x < g.x1 && point.y >= g.y0 && point.y < g.y1,
  );
  return hit?.key;
}

/**
 * Given a keyboard's rows and a raw touch path (as sampled from a swipe
 * gesture), returns the ordered, de-duplicated sequence of keys the path
 * passed over. Points outside every key's bounds are ignored. Pure function:
 * no I/O, no mutation, safe to call from any thread.
 */
export function keysAlongPath(rows: KeyRow[], path: TouchPoint[], rowHeight = 1): Key[] {
  const geometry = computeGeometry(rows, rowHeight);
  const result: Key[] = [];
  for (const point of path) {
    const key = keyAt(geometry, point);
    if (key && result[result.length - 1]?.id !== key.id) {
      result.push(key);
    }
  }
  return result;
}
