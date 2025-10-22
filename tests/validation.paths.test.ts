import { describe, it, expect } from "vitest";
import { isValidPath, MIN_PATH_LENGTH } from "@/lib/validation/paths";
import type { Coord } from "@/lib/validation/adjacency";
import { generateBoardForDate } from "@/lib/board/generate";

const BOARD = generateBoardForDate("2025-01-02", "validation-salt");

describe("isValidPath", () => {
  it("rejects paths shorter than minimum length", () => {
    const path: Coord[] = [[0, 0], [0, 1], [0, 2]]; // length 3
    expect(isValidPath(BOARD, path)).toBe(false);
  });

  it("rejects out-of-bounds coordinates", () => {
    const path: Coord[] = [[0, 0], [0, 1], [-1, 1], [0, 2]]; // -1 row
    expect(isValidPath(BOARD, path)).toBe(false);
  });

  it("rejects non-adjacent consecutive coordinates", () => {
    const path: Coord[] = [[0, 0], [0, 2], [0, 3], [0, 4]]; // 0,0 -> 0,2 jumps
    expect(isValidPath(BOARD, path)).toBe(false);
  });

  it("rejects paths that reuse a cell", () => {
    const path: Coord[] = [[1, 1], [1, 2], [1, 1], [1, 0]]; // revisit [1,1]
    expect(isValidPath(BOARD, path)).toBe(false);
  });

  it("accepts a valid contiguous 8-way path of length >= 4", () => {
    const path: Coord[] = [[0, 0], [0, 1], [1, 2], [2, 3], [3, 3]]; // includes diagonal steps
    expect(isValidPath(BOARD, path)).toBe(true);
  });
});
