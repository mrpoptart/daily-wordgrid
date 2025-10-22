export type Coord = [row: number, col: number];

/**
 * Returns true if two coordinates are 8-way adjacent (including diagonals), excluding identity.
 * Uses Chebyshev distance: adjacent when max(|dr|, |dc|) === 1.
 */
export function areAdjacent(a: Coord, b: Coord): boolean {
  const rowDelta = Math.abs(a[0] - b[0]);
  const colDelta = Math.abs(a[1] - b[1]);
  if (rowDelta === 0 && colDelta === 0) return false; // same cell is not adjacent
  return rowDelta <= 1 && colDelta <= 1;
}
