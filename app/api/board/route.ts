import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { generateBoardForDate } from "@/lib/board/generate";
import type { Board } from "@/lib/board/types";
import {
  flattenBoard,
  lettersToBoard,
  resolveBoardDate,
  resolveDailySalt,
} from "@/lib/board/api-helpers";
import { findGameByDate, saveGame } from "@/lib/board/game-store";

export type BoardResponse = {
  status: "ok";
  date: string; // YYYY-MM-DD
  board: Board;
  letters: string; // flattened 25-letter string
  env: {
    hasDailySalt: boolean;
  };
};

function hashSeed(date: string, salt: string): string {
  return createHash("sha256").update(`${date}|${salt}`).digest("hex");
}

export async function GET(req?: Request) {
  const url = req ? new URL(req.url) : null;
  const dateParam = url ? url.searchParams.get("date") : null;
  const date = resolveBoardDate(dateParam);

  const { salt, hasDailySalt } = resolveDailySalt();

  const existing = await findGameByDate(date);

  let board: Board | null = null;
  let letters: string | null = null;

  if (existing) {
    board = lettersToBoard(existing.letters);
    if (board) {
      letters = existing.letters;
    }
  }

  if (!board) {
    board = generateBoardForDate(date, salt);
    letters = flattenBoard(board);
    await saveGame({
      date,
      letters,
      seed: hashSeed(date, salt),
    });
  }

  const safeLetters = letters ?? flattenBoard(board);

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters: safeLetters,
    env: { hasDailySalt },
  };

  return NextResponse.json(body, { status: 200 });
}
