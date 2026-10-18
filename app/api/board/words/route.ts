import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import { findAllBoardWords } from "@/lib/board/solver";
import { resolveBoardDate, resolveDailySalt } from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = resolveBoardDate(dateParam);

  const { salt } = resolveDailySalt();
  const board = generateBoardForDate(date, salt);

  const allWords = findAllBoardWords(board);

  return NextResponse.json(
    { status: "ok", date, words: allWords },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    }
  );
}
