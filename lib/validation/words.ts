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

function findWordPath(board: Board, word: string): Coord[] | null {
  if (word.length < MIN_PATH_LENGTH) return null;

  const size = board.length;
  const letters = word.split("");

  function dfs(
    row: number,
    col: number,
    index: number,
    visited: Set<string>,
    path: Coord[],
  ): boolean {
    const key = `${row},${col}`;
    if (visited.has(key)) return false;
    if (board[row][col] !== letters[index]) return false;

    visited.add(key);
    path.push([row, col]);

    if (index === letters.length - 1) {
      return true;
    }

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (nextRow < 0 || nextCol < 0) continue;
        if (nextRow >= size || nextCol >= size) continue;
        if (dfs(nextRow, nextCol, index + 1, visited, path)) {
          return true;
        }
      }
    }

    visited.delete(key);
    path.pop();
    return false;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] !== letters[0]) continue;
      const visited = new Set<string>();
      const path: Coord[] = [];
      if (dfs(row, col, 0, visited, path)) {
        return path;
      }
    }
  }

  return null;
}

export function validateWordOnBoard(board: Board, word: string): WordCheck {
  const normalized = typeof word === "string" ? word.trim().toUpperCase() : "";
  if (normalized.length < MIN_PATH_LENGTH) {
    return { ok: false, reason: "too-short" };
  }

  if (!isSowpodsWord(normalized)) {
    return { ok: false, reason: "not-in-dictionary", word: normalized };
  }

  const path = findWordPath(board, normalized);
  if (!path) {
    return { ok: false, reason: "invalid-path", word: normalized };
  }

  return validateWord(board, path);
}
