import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import type { Board } from "@/lib/board/types";

export type BoardResponse = {
  status: "ok";
  date: string; // YYYY-MM-DD
  board: Board;
  letters: string; // flattened 25-letter string
  env: {
    hasDailySalt: boolean;
  };
};

function normalizeDateInput(dateParam: string | null): string | null {
  if (!dateParam) return null;
  const s = dateParam.trim();
  if (s.length === 0) return null;
  // basic ISO date validation (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function flattenBoard(board: Board): string {
  let out = "";
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      out += board[r][c];
    }
  }
  return out;
}

export async function GET(req?: Request) {
  const url = req ? new URL(req.url) : null;
  const dateParam = url ? url.searchParams.get("date") : null;
  const normalized = normalizeDateInput(dateParam);

  const date: string = normalized ?? formatDateUTC(new Date());

  const envSaltRaw = typeof process?.env?.BOARD_DAILY_SALT === "string" ? process.env.BOARD_DAILY_SALT : null;
  const envSalt = envSaltRaw ? envSaltRaw.trim() : null;
  const hasDailySalt = Boolean(envSalt && envSalt.length > 0);
  const salt = hasDailySalt ? (envSalt as string) : "dev-salt";

  const board = generateBoardForDate(date, salt);

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters: flattenBoard(board),
    env: { hasDailySalt },
  };

  return NextResponse.json(body, { status: 200 });
}
