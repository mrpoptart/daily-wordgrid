import { describe, it, expect } from "vitest";
import {
  buildSegments,
  segmentBreakdownLines,
  formatSegmentTime,
  SEGMENT_SECONDS,
} from "@/lib/segments";

describe("buildSegments", () => {
  it("returns a single segment at the default time limit", () => {
    const segs = buildSegments([], SEGMENT_SECONDS);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ index: 0, startSec: 0, endSec: 300, score: 0 });
    expect(segs[0].words).toEqual([]);
  });

  it("creates one segment per 5-minute block up to the time limit", () => {
    const segs = buildSegments([], 900);
    expect(segs.map(s => [s.startSec, s.endSec])).toEqual([
      [0, 300],
      [300, 600],
      [600, 900],
    ]);
  });

  it("buckets words by elapsed_at", () => {
    const words = [
      { word: "EARLY", score: 2, elapsedAt: 10 },
      { word: "MIDDLE", score: 3, elapsedAt: 250 },
      { word: "SECOND", score: 3, elapsedAt: 301 },
      { word: "LATE", score: 1, elapsedAt: 599 },
      { word: "THIRDD", score: 3, elapsedAt: 700 },
    ];
    const segs = buildSegments(words, 900);

    expect(segs[0].words.map(w => w.word)).toEqual(["EARLY", "MIDDLE"]);
    expect(segs[0].score).toBe(5);

    expect(segs[1].words.map(w => w.word)).toEqual(["SECOND", "LATE"]);
    expect(segs[1].score).toBe(4);

    expect(segs[2].words.map(w => w.word)).toEqual(["THIRDD"]);
    expect(segs[2].score).toBe(3);
  });

  it("treats missing elapsedAt as 0 (first segment)", () => {
    const segs = buildSegments(
      [{ word: "OLD", score: 2 }],
      600
    );
    expect(segs[0].words).toHaveLength(1);
    expect(segs[1].words).toHaveLength(0);
  });

  it("clamps out-of-range elapsed_at into the last segment", () => {
    const segs = buildSegments(
      [{ word: "LATEWORD", score: 11, elapsedAt: 9999 }],
      600
    );
    expect(segs[segs.length - 1].words).toHaveLength(1);
  });

  it("segment boundaries are half-open: exactly 300s goes to segment 1", () => {
    const segs = buildSegments(
      [
        { word: "ONBOUND", score: 5, elapsedAt: 300 },
        { word: "BEFORE", score: 3, elapsedAt: 299 },
      ],
      600
    );
    expect(segs[0].words.map(w => w.word)).toEqual(["BEFORE"]);
    expect(segs[1].words.map(w => w.word)).toEqual(["ONBOUND"]);
  });
});

describe("segmentBreakdownLines", () => {
  it("skips empty segments", () => {
    const segs = buildSegments(
      [{ word: "HI", score: 1, elapsedAt: 0 }],
      900
    );
    const lines = segmentBreakdownLines(segs);
    expect(lines).toEqual([
      { label: "0:00–5:00", score: 1, wordCount: 1 },
    ]);
  });

  it("produces labels for each non-empty segment", () => {
    const segs = buildSegments(
      [
        { word: "A", score: 2, elapsedAt: 10 },
        { word: "B", score: 3, elapsedAt: 400 },
        { word: "C", score: 3, elapsedAt: 410 },
      ],
      900
    );
    const lines = segmentBreakdownLines(segs);
    expect(lines).toEqual([
      { label: "0:00–5:00", score: 2, wordCount: 1 },
      { label: "5:00–10:00", score: 6, wordCount: 2 },
    ]);
  });
});

describe("formatSegmentTime", () => {
  it("formats minute/second values", () => {
    expect(formatSegmentTime(0)).toBe("0:00");
    expect(formatSegmentTime(5)).toBe("0:05");
    expect(formatSegmentTime(65)).toBe("1:05");
    expect(formatSegmentTime(300)).toBe("5:00");
    expect(formatSegmentTime(900)).toBe("15:00");
  });
});
