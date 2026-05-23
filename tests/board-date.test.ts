import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { resolveBoardDate } from "@/lib/board/api-helpers";
import { fetchBoard } from "@/lib/board/fetch";

describe("resolveBoardDate", () => {
  // Midnight PT is 7am UTC (assuming Daylight Saving Time, UTC-7).
  // Let's use 7:00 AM UTC.
  // PT: 00:00 (Next Day)
  // ET (UTC-4): 03:00 (Next Day)
  const fixedNow = new Date(Date.UTC(2024, 4, 20, 7, 0, 0)); // May 20, 7am UTC -> May 20 00:00 PT

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the provided date string when valid", () => {
    expect(resolveBoardDate("2024-05-10", "America/Los_Angeles")).toBe("2024-05-10");
  });

  it("ignores the requester time zone and uses PT", () => {
    // ET would still be May 20, and PT is May 20 at 7am UTC
    const date = resolveBoardDate(null, "America/New_York");
    expect(date).toBe("2024-05-20");
  });

  it("falls back to Pacific time when no time zone is provided", () => {
    const date = resolveBoardDate(null, null);
    expect(date).toBe("2024-05-20");
  });

  it("falls back to Pacific time when the time zone is invalid", () => {
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
    const boardForJan1 = await fetchBoard();

    vi.setSystemTime(jan2);
    const boardForJan2 = await fetchBoard();

    expect(boardForJan1?.date).toBe("2025-01-01");
    expect(boardForJan2?.date).toBe("2025-01-02");
    expect(boardForJan1?.board).toBeDefined();
    expect(boardForJan2?.board).toBeDefined();
    expect(JSON.stringify(boardForJan1?.board)).not.toBe(
      JSON.stringify(boardForJan2?.board),
    );
  });
});
