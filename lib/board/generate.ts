import { createPrng } from "@/lib/board/prng";
import type { Board } from "@/lib/board/types";

const PHYSICAL_DICE: readonly string[] = [
  "FAYIRS",
  "EEEEAM",
  "TOOOTU",
  "HORDNL",
  "YRRRIP",
  "TETTMO",
  "DNAENN",
  "HLRNDO",
  "GAEMEU",
  "WONOTU",
  "VGRROW",
  "PLETIC",
  "ASRAFA",
  "DNODHT",
  "RFIASA",
  "DROLHH",
  "TESCCN",
  "JKBXZQ",
  "NAGMNE",
  "SESUSN",
  "PFSYRI",
  "ITECIL",
  "TETIII",
  "EEEEAA",
  "PIESTC",
];

function formatDate(date: string | Date): string {
  if (typeof date === "string") return date;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shuffleDice(prng: ReturnType<typeof createPrng>): string[] {
  const dice = [...PHYSICAL_DICE];
  for (let i = dice.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  return dice;
}

function rollDie(die: string, prng: ReturnType<typeof createPrng>): string {
  const faceIndex = prng.nextInt(die.length);
  return die[faceIndex];
}

export function generateBoardForDate(date: string | Date, salt: string): Board {
  const dateStr = formatDate(date);
  const prng = createPrng(`${dateStr}|${salt}`);
  const dice = shuffleDice(prng);
  const cells: string[] = dice.map((die) => rollDie(die, prng));
  const board: Board = [
    [cells[0], cells[1], cells[2], cells[3], cells[4]],
    [cells[5], cells[6], cells[7], cells[8], cells[9]],
    [cells[10], cells[11], cells[12], cells[13], cells[14]],
    [cells[15], cells[16], cells[17], cells[18], cells[19]],
    [cells[20], cells[21], cells[22], cells[23], cells[24]],
  ];
  return board;
}
