import type { Board } from "@/lib/board/types";

export function normalizeDateInput(dateParam: string | null | undefined): string | null {
  if (!dateParam) return null;
  const trimmed = dateParam.trim();
  if (trimmed.length === 0) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveBoardDate(dateParam: string | null | undefined): string {
  const normalized = normalizeDateInput(dateParam);
  return normalized ?? formatDateUTC(new Date());
}

export function flattenBoard(board: Board): string {
  let out = "";
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      out += board[r][c];
    }
  }
  return out;
}

export function lettersToBoard(letters: string): Board | null {
  if (typeof letters !== "string" || !/^[A-Z]{25}$/.test(letters)) {
    return null;
  }

  const rows: string[][] = [[], [], [], [], []];
  for (let i = 0; i < letters.length; i++) {
    const row = Math.floor(i / 5);
    rows[row].push(letters[i]);
  }

  return rows as Board;
}

export function resolveDailySalt(): { salt: string; hasDailySalt: boolean } {
  const raw = typeof process?.env?.BOARD_DAILY_SALT === "string" ? process.env.BOARD_DAILY_SALT : null;
  const trimmed = raw ? raw.trim() : "";
  const hasDailySalt = trimmed.length > 0;
  return {
    salt: hasDailySalt ? trimmed : "dev-salt",
    hasDailySalt,
  };
}
