import type { Board } from "@/lib/board/types";
import type { Coord } from "@/lib/validation/adjacency";
import { isValidPath, MIN_PATH_LENGTH } from "@/lib/validation/paths";
import { isSowpodsWord } from "@/lib/dictionary";

export type WordCheck = {
  ok: boolean;
  reason?: "invalid-path" | "too-short" | "not-in-dictionary";
  word?: string;
};

export function assembleWord(board: Board, path: Coord[]): string {
  const letters: string[] = [];
  for (const [row, col] of path) {
    letters.push(board[row][col]);
  }
  return letters.join("");
}

function isInBounds(board: Board, row: number, col: number): boolean {
  const size = board.length;
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function findPathForWord(board: Board, rawWord: string): Coord[] | null {
  const target = rawWord.trim().toUpperCase();
  if (!target) return null;

  const neighbors: [number, number][] = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  function dfs(
    row: number,
    col: number,
    index: number,
    path: Coord[],
    visited: Set<string>,
  ): Coord[] | null {
    if (board[row][col] !== target[index]) return null;

    const coord: Coord = [row, col];
    const key = `${row},${col}`;
    if (visited.has(key)) return null;

    const nextPath = [...path, coord];
    if (index === target.length - 1) return nextPath;

    visited.add(key);

    for (const [dr, dc] of neighbors) {
      const nextRow = row + dr;
      const nextCol = col + dc;

      if (!isInBounds(board, nextRow, nextCol)) continue;
      if (visited.has(`${nextRow},${nextCol}`)) continue;
      if (board[nextRow][nextCol] !== target[index + 1]) continue;

      const result = dfs(nextRow, nextCol, index + 1, nextPath, visited);
      if (result) return result;
    }

    visited.delete(key);
    return null;
  }

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] !== target[0]) continue;
      const result = dfs(row, col, 0, [], new Set());
      if (result) return result;
    }
  }

  return null;
}

export function validateWord(board: Board, path: Coord[]): WordCheck {
  if (!Array.isArray(path) || path.length < MIN_PATH_LENGTH) {
    return { ok: false, reason: "too-short" };
  }

  if (!isValidPath(board, path)) {
    return { ok: false, reason: "invalid-path" };
  }

  const word = assembleWord(board, path);
  if (!isSowpodsWord(word)) {
    return { ok: false, reason: "not-in-dictionary", word };
  }

  return { ok: true, word };
}
