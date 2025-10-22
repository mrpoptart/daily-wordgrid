import { describe, it, expect } from "vitest";
import { isSowpodsWord } from "@/lib/dictionary";

// Basic smoke for known SOWPODS entries and negatives
// Using short known words from SOWPODS and bogus strings

describe("isSowpodsWord", () => {
  it("accepts valid SOWPODS words (case-insensitive)", () => {
    expect(isSowpodsWord("banana")).toBe(true);
    expect(isSowpodsWord("BANANA")).toBe(true);
    expect(isSowpodsWord("BanAnA")).toBe(true);
  });

  it("rejects invalid or empty input", () => {
    expect(isSowpodsWord("")).toBe(false);
    expect(isSowpodsWord("   ")).toBe(false);
    expect(isSowpodsWord("asdfjkl")).toBe(false);
  });
});
