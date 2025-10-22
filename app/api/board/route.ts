import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import type { Board } from "@/lib/board/types";

export type BoardResponse = {
  status: "ok";
  date: string;
  board: Board;
  letters: string; // flattened 25-letter string
  env: {
    hasDailySalt: boolean;
  };
};

function getSalt(): string | null {
  const raw = process.env.BOARD_DAILY_SALT;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
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

export async function GET(request?: Request) {
  const url = new URL(request?.url ?? "http://localhost/api/board");
  const dateParam = url.searchParams.get("date");

  // Accept either YYYY-MM-DD or default to today's UTC date
  const todayUtc = new Date();
  const y = todayUtc.getUTCFullYear();
  const m = String(todayUtc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(todayUtc.getUTCDate()).padStart(2, "0");
  const defaultDate = `${y}-${m}-${d}`;
  const date = dateParam && dateParam.trim().length > 0 ? dateParam : defaultDate;

  const salt = getSalt() ?? "dev-salt";
  const board = generateBoardForDate(date, salt);

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters: flattenBoard(board),
    env: { hasDailySalt: getSalt() !== null },
  };

  return NextResponse.json(body, { status: 200 });
}
