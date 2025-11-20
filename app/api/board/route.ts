import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { games } from "@/db/schema";
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
  const seed = createHash("sha256").update(`${date}|${salt}`).digest("hex");

  const board = generateBoardForDate(date, salt);
  const letters = flattenBoard(board);

  try {
    await db
      .insert(games)
      .values({ date, letters, seed })
      .onConflictDoUpdate({
        target: games.date,
        set: { letters, seed },
      });
  } catch (error) {
    console.error("Failed to persist daily board", error);
  }

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters,
    env: { hasDailySalt },
  };

  return NextResponse.json(body, { status: 200 });
}
