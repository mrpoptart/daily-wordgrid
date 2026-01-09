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

function normalizeTimeZone(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const trimmed = tz.trim();
  if (trimmed.length === 0) return null;

  try {
    // will throw on invalid time zone
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format();
    return trimmed;
  } catch {
    return null;
  }
}

function formatDateForTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

const DEFAULT_TIME_ZONE = "America/New_York";

/**
 * Resolves the board date.
 * It ignores the user's timezone and enforces Eastern Time (America/New_York) as the global standard.
 * The timeZone parameter is kept for backward compatibility/testing but is effectively ignored.
 */
export function resolveBoardDate(
  dateParam: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timeZone?: string | null,
): string {
  const normalized = normalizeDateInput(dateParam);
  if (normalized) return normalized;

  // Always use DEFAULT_TIME_ZONE (America/New_York)
  // This ensures everyone sees the same board that changes at 12am ET.
  return formatDateForTimeZone(new Date(), DEFAULT_TIME_ZONE);
}

export function resolveTimeZone(
  queryTimeZone: string | null | undefined,
  headerTimeZone?: string | null,
): string | null {
  return normalizeTimeZone(queryTimeZone) ?? normalizeTimeZone(headerTimeZone);
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

export function boardToUrlId(board: Board): string {
  const cells: string[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      cells.push(board[r][c]);
    }
  }
  return cells.join("-");
}

export function urlIdToBoard(id: string): Board | null {
  try {
    const cells = id.split("-");
    if (cells.length !== 25) return null;

    // Validate each cell is uppercase letters
    for (const cell of cells) {
      if (!/^[A-Z]+$/.test(cell)) return null;
    }

    const board: Board = [
      [cells[0], cells[1], cells[2], cells[3], cells[4]],
      [cells[5], cells[6], cells[7], cells[8], cells[9]],
      [cells[10], cells[11], cells[12], cells[13], cells[14]],
      [cells[15], cells[16], cells[17], cells[18], cells[19]],
      [cells[20], cells[21], cells[22], cells[23], cells[24]],
    ];

    return board;
  } catch {
    return null;
  }
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
