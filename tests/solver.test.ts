import { describe, expect, it } from "vitest";
import { findAllBoardWords, computeWordLengthCounts } from "@/lib/board/solver";
import type { Board } from "@/lib/board/types";

const testBoard: Board = [
  ["T", "E", "S", "T", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
];

describe("findAllBoardWords", () => {
  it("finds known words on the board", () => {
    const words = findAllBoardWords(testBoard);
    expect(words.length).toBeGreaterThan(0);
    // TEST should be findable (T-E-S-T across row 0)
    expect(words).toContain("TEST");
  });

  it("only finds words of length >= 4", () => {
    const words = findAllBoardWords(testBoard);
    for (const word of words) {
      expect(word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("returns sorted unique words", () => {
    const words = findAllBoardWords(testBoard);
    const sorted = [...words].sort();
    expect(words).toEqual(sorted);
    const unique = [...new Set(words)];
    expect(words).toEqual(unique);
  });
});

describe("computeWordLengthCounts", () => {
  it("buckets words by length correctly", () => {
    const words = ["TEST", "TESTS", "TESTES", "TESTING", "TESTABLE", "AAAAAAAAA"];
    const counts = computeWordLengthCounts(words);
    expect(counts).toEqual({ "4": 1, "5": 1, "6": 1, "7": 1, "8+": 2 });
  });

  it("returns zero counts for empty input", () => {
    const counts = computeWordLengthCounts([]);
    expect(counts).toEqual({ "4": 0, "5": 0, "6": 0, "7": 0, "8+": 0 });
  });
});
