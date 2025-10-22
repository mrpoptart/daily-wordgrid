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
