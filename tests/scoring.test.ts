import { describe, it, expect } from "vitest";
import { scoreWordLength } from "@/lib/scoring";

/** Mapping: 4→1, 5→2, 6→3, 7→5, 8+→11 */
describe("scoreWordLength", () => {
  it("scores below 4 as 0", () => {
    expect(scoreWordLength(0)).toBe(0);
    expect(scoreWordLength(1)).toBe(0);
    expect(scoreWordLength(2)).toBe(0);
    expect(scoreWordLength(3)).toBe(0);
  });

  it("scores exact lengths per table", () => {
    expect(scoreWordLength(4)).toBe(1);
    expect(scoreWordLength(5)).toBe(2);
    expect(scoreWordLength(6)).toBe(3);
    expect(scoreWordLength(7)).toBe(5);
    expect(scoreWordLength(8)).toBe(11);
    expect(scoreWordLength(12)).toBe(11);
  });

  it("floors non-integer inputs", () => {
    expect(scoreWordLength(3.9)).toBe(0);
    expect(scoreWordLength(4.1)).toBe(1);
    expect(scoreWordLength(7.99)).toBe(5);
  });

  it("handles non-finite numbers as 0", () => {
    expect(scoreWordLength(Number.NaN)).toBe(0);
    expect(scoreWordLength(Number.POSITIVE_INFINITY)).toBe(0);
    expect(scoreWordLength(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});
