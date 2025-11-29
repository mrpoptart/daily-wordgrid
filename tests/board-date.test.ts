import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { resolveBoardDate } from "@/lib/board/api-helpers";

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
