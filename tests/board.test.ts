import { describe, it, expect } from "vitest";
import { generateBoardForDate } from "@/lib/board/generate";
import { isBoard } from "@/lib/board/types";

const SALT = "unit-test-salt";

describe("deterministic board generator", () => {
  it("produces a 5x5 uppercase board", () => {
    const board = generateBoardForDate("2025-01-02", SALT);
    expect(isBoard(board)).toBe(true);
  });

  it("is deterministic for same date + salt", () => {
    const a = generateBoardForDate("2025-01-02", SALT);
    const b = generateBoardForDate(new Date(Date.UTC(2025, 0, 2)), SALT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("differs for different dates with same salt", () => {
    const a = generateBoardForDate("2025-01-02", SALT);
    const b = generateBoardForDate("2025-01-03", SALT);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
