import { createPrng } from "@/lib/board/prng";
import type { Board } from "@/lib/board/types";
import { formatUtcDate } from "@/lib/date";

// Letter frequency weights (approximate English letter frequencies)
// Values are relative; only ratios matter.
const LETTER_WEIGHTS: Record<string, number> = {
  A: 8167,
  B: 1492,
  C: 2782,
  D: 4253,
  E: 12702,
  F: 2228,
  G: 2015,
  H: 6094,
  I: 6966,
  J: 153,
  K: 772,
  L: 4025,
  M: 2406,
  N: 6749,
  O: 7507,
  P: 1929,
  Q: 95,
  R: 5987,
  S: 6327,
  T: 9056,
  U: 2758,
  V: 978,
  W: 2360,
  X: 150,
  Y: 1974,
  Z: 74,
};

const LETTERS = Object.keys(LETTER_WEIGHTS);
const CUMULATIVE: { letter: string; cum: number }[] = (() => {
  let sum = 0;
  return LETTERS.map((letter) => {
    sum += LETTER_WEIGHTS[letter];
    return { letter, cum: sum };
  });
})();
const TOTAL_WEIGHT = CUMULATIVE[CUMULATIVE.length - 1].cum;

function pickLetter(prng: ReturnType<typeof createPrng>): string {
  const r = Math.floor(prng.next() * TOTAL_WEIGHT);
  // binary search cumulative distribution
  let lo = 0;
  let hi = CUMULATIVE.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (r < CUMULATIVE[mid].cum) hi = mid;
    else lo = mid + 1;
  }
  return CUMULATIVE[lo].letter;
}

export function generateBoardForDate(date: string | Date, salt: string): Board {
  const dateStr = typeof date === "string" ? date : formatUtcDate(date);
  const prng = createPrng(`${dateStr}|${salt}`);
  const cells: string[] = Array.from({ length: 25 }, () => pickLetter(prng));
  const board: Board = [
    [cells[0], cells[1], cells[2], cells[3], cells[4]],
    [cells[5], cells[6], cells[7], cells[8], cells[9]],
    [cells[10], cells[11], cells[12], cells[13], cells[14]],
    [cells[15], cells[16], cells[17], cells[18], cells[19]],
    [cells[20], cells[21], cells[22], cells[23], cells[24]],
  ];
  return board;
}
