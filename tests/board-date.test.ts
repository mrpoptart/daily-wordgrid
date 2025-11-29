import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { resolveBoardDate } from "@/lib/board/api-helpers";
import { fetchBoard } from "@/lib/board/fetch";

describe("resolveBoardDate", () => {
  const fixedNow = new Date(Date.UTC(2024, 4, 20, 1, 0, 0));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the provided date string when valid", () => {
    expect(resolveBoardDate("2024-05-10", "America/New_York")).toBe("2024-05-10");
  });

  it("uses the requester time zone when available", () => {
    const date = resolveBoardDate(null, "America/Los_Angeles");
    expect(date).toBe("2024-05-19");
  });

  it("falls back to UTC when the time zone is invalid", () => {
    const date = resolveBoardDate(null, "Totally/Invalid");
    expect(date).toBe("2024-05-20");
  });
});

describe("daily board rollover", () => {
  const jan1 = new Date(Date.UTC(2025, 0, 1, 12));
  const jan2 = new Date(Date.UTC(2025, 0, 2, 12));
  const originalSalt = process.env.BOARD_DAILY_SALT;

  beforeEach(() => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt";
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  });

  afterEach(() => {
    process.env.BOARD_DAILY_SALT = originalSalt;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns different boards on consecutive days", async () => {
    vi.setSystemTime(jan1);
    const boardForJan1 = await fetchBoard({ timeZone: "UTC" });

    vi.setSystemTime(jan2);
    const boardForJan2 = await fetchBoard({ timeZone: "UTC" });

    expect(boardForJan1?.date).toBe("2025-01-01");
    expect(boardForJan2?.date).toBe("2025-01-02");
    expect(boardForJan1?.board).toBeDefined();
    expect(boardForJan2?.board).toBeDefined();
    expect(JSON.stringify(boardForJan1?.board)).not.toBe(
      JSON.stringify(boardForJan2?.board),
    );
  });
});
