import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import { findAllBoardWords, computeWordLengthCounts, type WordLengthCounts } from "@/lib/board/solver";
import type { Board } from "@/lib/board/types";
import {
  flattenBoard,
  resolveBoardDate,
  resolveDailySalt,
} from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export type BoardResponse = {
  status: "ok";
  date: string; // YYYY-MM-DD
  board: Board;
  letters: string; // flattened 25-letter string
  wordLengthCounts: WordLengthCounts;
  env: {
    hasDailySalt: boolean;
  };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  // We ignore timezone params and headers, enforcing default ET.
  const date = resolveBoardDate(dateParam);

  const { salt, hasDailySalt } = resolveDailySalt();

  // Boards are deterministic (date + salt), so they are generated on demand.
  const board: Board = generateBoardForDate(date, salt);
  const letters = flattenBoard(board);
  const wordLengthCounts: WordLengthCounts = computeWordLengthCounts(findAllBoardWords(board));

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters,
    wordLengthCounts,
    env: { hasDailySalt },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
