import type { Board } from "@/lib/board/types";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";

type TrieNode = {
  [key: string]: TrieNode;
} & { _?: boolean };

/**
 * Find all valid dictionary words that can be formed on the given board
 * using Boggle rules (adjacent cells, no reuse). Uses the pf-sowpods trie
 * for efficient prefix pruning during DFS.
 *
 * Returns a sorted array of unique uppercase words.
 */
export function findAllBoardWords(board: Board): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sowpods = require("pf-sowpods");
  const trie: TrieNode = sowpods.trie;

  const size = board.length;
  const found = new Set<string>();

  const neighbors: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function dfs(
    row: number,
    col: number,
    node: TrieNode,
    word: string,
    visited: boolean[][],
  ) {
    const cellValue = board[row][col];

    // Walk the trie through each character of the cell (handles "QU")
    let current: TrieNode | undefined = node;
    for (const ch of cellValue) {
      current = current[ch] as TrieNode | undefined;
      if (!current) return;
    }

    const newWord = word + cellValue;

    // If we've reached a complete word of sufficient length, record it
    if (current._ && newWord.length >= MIN_PATH_LENGTH) {
      found.add(newWord);
    }

    visited[row][col] = true;

    for (const [dr, dc] of neighbors) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr][nc]) continue;
      dfs(nr, nc, current, newWord, visited);
    }

    visited[row][col] = false;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const visited = Array.from({ length: size }, () => Array(size).fill(false) as boolean[]);
      dfs(row, col, trie, "", visited);
    }
  }

  return Array.from(found).sort();
}

/**
 * Compute word length distribution buckets: 4, 5, 6, 7, 8+
 * Returns an object like { "4": 20, "5": 15, "6": 5, "7": 3, "8+": 1 }
 */
export type WordLengthCounts = Record<string, number>;

export function computeWordLengthCounts(words: string[]): WordLengthCounts {
  const counts: WordLengthCounts = { "4": 0, "5": 0, "6": 0, "7": 0, "8+": 0 };

  for (const word of words) {
    const len = word.length;
    if (len <= 3) continue;
    if (len >= 8) {
      counts["8+"]++;
    } else {
      counts[String(len)]++;
    }
  }

  return counts;
}
