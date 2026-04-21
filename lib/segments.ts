export const SEGMENT_SECONDS = 300;
export const DEFAULT_TIME_LIMIT_SECONDS = SEGMENT_SECONDS;

export type SegmentWord = {
  word: string;
  score: number;
  elapsedAt?: number;
};

export type Segment<W extends SegmentWord = SegmentWord> = {
  index: number;
  startSec: number;
  endSec: number;
  words: W[];
  score: number;
};

/**
 * Bucket words into fixed 5-minute segments based on elapsed_at.
 * Always returns at least ceil(timeLimitSeconds / SEGMENT_SECONDS) segments
 * so the UI shows empty trailing buckets for time the user has committed to.
 * Words with elapsed_at past the last segment (shouldn't happen in practice,
 * but guards older data) land in the final bucket.
 */
export function buildSegments<W extends SegmentWord>(
  words: W[],
  timeLimitSeconds: number
): Segment<W>[] {
  const segmentCount = Math.max(
    1,
    Math.ceil(timeLimitSeconds / SEGMENT_SECONDS)
  );

  const segments: Segment<W>[] = Array.from({ length: segmentCount }, (_, i) => ({
    index: i,
    startSec: i * SEGMENT_SECONDS,
    endSec: (i + 1) * SEGMENT_SECONDS,
    words: [],
    score: 0,
  }));

  for (const w of words) {
    const elapsed = w.elapsedAt ?? 0;
    let idx = Math.floor(elapsed / SEGMENT_SECONDS);
    if (idx < 0) idx = 0;
    if (idx >= segmentCount) idx = segmentCount - 1;
    segments[idx].words.push(w);
    segments[idx].score += w.score;
  }

  return segments;
}

/** Format a second offset as M:SS (e.g. 300 → "5:00"). */
export function formatSegmentTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type SegmentBreakdownLine = {
  label: string;
  score: number;
  wordCount: number;
};

/** Produce printable "5:00 — 80 pts (3 words)" lines, skipping empty segments. */
export function segmentBreakdownLines(segments: Segment[]): SegmentBreakdownLine[] {
  return segments
    .filter(s => s.words.length > 0)
    .map(s => ({
      label: `${formatSegmentTime(s.startSec)}–${formatSegmentTime(s.endSec)}`,
      score: s.score,
      wordCount: s.words.length,
    }));
}
