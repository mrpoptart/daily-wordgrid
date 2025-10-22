/**
 * Compute score for a word length using the defined mapping:
 * 4 → 1, 5 → 2, 6 → 3, 7 → 5, 8+ → 11. Lengths < 4 score 0.
 */
export function scoreWordLength(length: number): number {
  if (!Number.isFinite(length)) return 0;
  const n = Math.floor(length);
  if (n < 4) return 0;
  switch (n) {
    case 4:
      return 1;
    case 5:
      return 2;
    case 6:
      return 3;
    case 7:
      return 5;
    default:
      return 11; // 8+
  }
}
