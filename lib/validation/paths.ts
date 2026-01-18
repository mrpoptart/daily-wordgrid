import type { Board } from "@/lib/board/types";
import type { Coord } from "@/lib/validation/adjacency";
import { areAdjacent } from "@/lib/validation/adjacency";

export const MIN_PATH_LENGTH = 4;

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isWithinBoard(board: Board, coord: Coord): boolean {
  const size = board.length; // 5 for current board
  const [row, col] = coord;
  return row >= 0 && row < size && col >= 0 && col < size;
}

// Minimum tiles needed to potentially form a valid word
// With QU tiles counting as 2 letters, 3 tiles can make a 4-letter word
const MIN_TILES_FOR_VALID_WORD = MIN_PATH_LENGTH - 1;

/**
 * Validates a path of coordinates over a square board under Boggle-like rules:
 * - Path must have enough tiles to potentially form a valid word
 * - All coordinates must be within board bounds
 * - No cell may be revisited (no reuse)
 * - Consecutive coordinates must be 8-way adjacent
 * Runs in O(k) time where k is the path length.
 */
export function isValidPath(board: Board, path: Coord[]): boolean {
  if (!Array.isArray(path)) return false;
  if (path.length < MIN_TILES_FOR_VALID_WORD) return false;

  const visited = new Set<string>();
  let previous: Coord | null = null;

  for (let index = 0; index < path.length; index++) {
    const coordinate = path[index];

    if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;
    const [row, col] = coordinate as [unknown, unknown];
    if (!isInteger(row) || !isInteger(col)) return false;

    const coord: Coord = [row as number, col as number];

    if (!isWithinBoard(board, coord)) return false;

    const key = `${coord[0]},${coord[1]}`;
    if (visited.has(key)) return false; // no reuse
    visited.add(key);

    if (previous && !areAdjacent(previous, coord)) return false; // must be adjacent

    previous = coord;
  }

  return true;
}
