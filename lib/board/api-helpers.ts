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

export function resolveBoardDate(
  dateParam: string | null | undefined,
  timeZone?: string | null,
): string {
  const normalized = normalizeDateInput(dateParam);
  if (normalized) return normalized;

  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const effectiveTimeZone = normalizedTimeZone ?? DEFAULT_TIME_ZONE;

  return formatDateForTimeZone(new Date(), effectiveTimeZone);
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

export function resolveDailySalt(): { salt: string; hasDailySalt: boolean } {
  const raw = typeof process?.env?.BOARD_DAILY_SALT === "string" ? process.env.BOARD_DAILY_SALT : null;
  const trimmed = raw ? raw.trim() : "";
  const hasDailySalt = trimmed.length > 0;
  return {
    salt: hasDailySalt ? trimmed : "dev-salt",
    hasDailySalt,
  };
}
