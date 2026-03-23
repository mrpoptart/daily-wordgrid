import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateBoardForDate } from "@/lib/board/generate";
import { findAllBoardWords } from "@/lib/board/solver";
import type { Board, BoardRow } from "@/lib/board/types";
import { resolveBoardDate, resolveDailySalt, flattenBoard } from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = resolveBoardDate(dateParam);

  let board: Board;

  // Try to fetch board from DB
  const { data: record } = await supabaseAdmin
    .from("games")
    .select("letters")
    .eq("date", date)
    .single();

  if (record) {
    const letters = record.letters as string;
    const rows: BoardRow[] = [];
    for (let i = 0; i < 5; i++) {
      const rowSlice = letters.slice(i * 5, (i + 1) * 5).split("");
      if (rowSlice.length === 5) {
        rows.push(rowSlice as BoardRow);
      }
    }

    if (rows.length === 5) {
      board = rows as Board;
    } else {
      // Fall back to generation
      const { salt } = resolveDailySalt();
      board = generateBoardForDate(date, salt);
    }
  } else {
    // Generate board if not in DB, and persist it
    const { salt } = resolveDailySalt();
    board = generateBoardForDate(date, salt);
    const letters = flattenBoard(board);
    const seed = createHash("sha256").update(`${date}|${salt}`).digest("hex");

    supabaseAdmin
      .from("games")
      .insert({ date, letters, seed })
      .then(({ error }) => {
        if (error) console.error("Failed to persist board:", error);
      });
  }

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
