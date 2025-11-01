import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import type { Board } from "@/lib/board/types";
import {
  flattenBoard,
  resolveBoardDate,
  resolveDailySalt,
} from "@/lib/board/api-helpers";

export type BoardResponse = {
  status: "ok";
  date: string; // YYYY-MM-DD
  board: Board;
  letters: string; // flattened 25-letter string
  env: {
    hasDailySalt: boolean;
  };
};

export async function GET(req?: Request) {
  const url = req ? new URL(req.url) : null;
  const dateParam = url ? url.searchParams.get("date") : null;
  const date = resolveBoardDate(dateParam);

  const { salt, hasDailySalt } = resolveDailySalt();

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
