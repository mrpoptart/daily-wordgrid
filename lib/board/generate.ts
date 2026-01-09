import { createPrng } from "@/lib/board/prng";
import type { Board } from "@/lib/board/types";

const DICE = [
  "fayirs",
  "eeeeam",
  "toootu",
  "hordnl",
  "yrrrip",
  "tettmo",
  "dnaenn",
  "hlrndo",
  "gaemeu",
  "wonotu",
  "vgrrow",
  "pletic",
  "asrafa",
  "dnodht",
  "rfiasa",
  "drolhh",
  "tesccn",
  "jkbxzq",
  "nagmne",
  "sesusn",
  "pfsyri",
  "itecil",
  "tetiii",
  "eeeeaa",
  "piestc",
];

function formatDate(date: string | Date): string {
  if (typeof date === "string") return date;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateBoardForDate(date: string | Date, salt: string): Board {
  const dateStr = formatDate(date);
  const prng = createPrng(`${dateStr}|${salt}`);

  // Shuffle dice positions
  const shuffledDice = [...DICE];
  for (let i = shuffledDice.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    [shuffledDice[i], shuffledDice[j]] = [shuffledDice[j], shuffledDice[i]];
  }

  // Pick a face for each die
  const cells: string[] = shuffledDice.map((die) => {
    const faceIndex = prng.nextInt(6);
    const letter = die[faceIndex].toUpperCase();
    // Convert Q to QU to make it always useful in English
    return letter === "Q" ? "QU" : letter;
  });

  const board: Board = [
    [cells[0], cells[1], cells[2], cells[3], cells[4]],
    [cells[5], cells[6], cells[7], cells[8], cells[9]],
    [cells[10], cells[11], cells[12], cells[13], cells[14]],
    [cells[15], cells[16], cells[17], cells[18], cells[19]],
    [cells[20], cells[21], cells[22], cells[23], cells[24]],
  ];
  return board;
}

export function generateRandomBoard(): Board {
  // Generate a random seed using timestamp and random number
  const randomSeed = `${Date.now()}-${Math.random()}`;
  const prng = createPrng(randomSeed);

  // Shuffle dice positions
  const shuffledDice = [...DICE];
  for (let i = shuffledDice.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    [shuffledDice[i], shuffledDice[j]] = [shuffledDice[j], shuffledDice[i]];
  }

  // Pick a face for each die
  const cells: string[] = shuffledDice.map((die) => {
    const faceIndex = prng.nextInt(6);
    const letter = die[faceIndex].toUpperCase();
    // Convert Q to QU to make it always useful in English
    return letter === "Q" ? "QU" : letter;
  });

  const board: Board = [
    [cells[0], cells[1], cells[2], cells[3], cells[4]],
    [cells[5], cells[6], cells[7], cells[8], cells[9]],
    [cells[10], cells[11], cells[12], cells[13], cells[14]],
    [cells[15], cells[16], cells[17], cells[18], cells[19]],
    [cells[20], cells[21], cells[22], cells[23], cells[24]],
  ];
  return board;
}
