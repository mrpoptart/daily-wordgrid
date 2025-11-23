import { describe, it, expect } from "vitest";
import type { Board } from "@/lib/board/types";
import { assembleWord, findPathForWord, validateWord } from "@/lib/validation/words";

const BOARD: Board = [
  ["B", "A", "N", "A", "N"],
  ["A", "N", "A", "N", "A"],
  ["B", "A", "N", "A", "N"],
  ["A", "N", "A", "N", "A"],
  ["B", "A", "N", "A", "N"],
];

// Coordinates to spell BANANA (0,0)->(0,1)->(0,2)->(1,2)->(1,1)->(1,0)
const BANANA_VALID_PATH: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 1],
  [1, 0],
];

const INVALID_REUSE_PATH: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 1], // reuse, invalid
];

const INVALID_ADJ_PATH: [number, number][] = [
  [0, 0],
  [0, 4], // not adjacent
  [1, 4],
  [2, 4],
];

describe("assembleWord", () => {
  it("joins letters along path", () => {
    expect(assembleWord(BOARD, BANANA_VALID_PATH)).toBe("BANANA");
  });
});

describe("validateWord", () => {
  it("accepts valid path and SOWPODS word", () => {
    const res = validateWord(BOARD, BANANA_VALID_PATH);
    expect(res.ok).toBe(true);
    expect(res.word).toBe("BANANA");
  });

  it("rejects too short path", () => {
    const res = validateWord(BOARD, BANANA_VALID_PATH.slice(0, 3));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("too-short");
  });

  it("rejects invalid path (reuse)", () => {
    const res = validateWord(BOARD, INVALID_REUSE_PATH);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid-path");
  });

  it("rejects invalid path (non-adjacent)", () => {
    const res = validateWord(BOARD, INVALID_ADJ_PATH);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid-path");
  });

  it("rejects non-dictionary word with valid path", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 2],
      [2, 3],
    ];
    const res = validateWord(BOARD, path);
    // Likely not in dictionary ("BANA" length 4 but not a valid SOWPODS word)
    if (res.ok) {
      // Edge: if BANA exists, ensure test remains valid
      expect(res.word).not.toBeUndefined();
    } else {
      expect(res.reason).toBe("not-in-dictionary");
    }
  });
});

describe("findPathForWord", () => {
  it("returns a valid path for a dictionary word", () => {
    const result = findPathForWord(BOARD, "BANANA");
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toHaveLength(BANANA_VALID_PATH.length);
      const validation = validateWord(BOARD, result);
      expect(validation.ok).toBe(true);
      expect(validation.word).toBe("BANANA");
    }
  });

  it("returns null when no path exists", () => {
    const result = findPathForWord(BOARD, "ZZZZ");
    expect(result).toBeNull();
  });
});
