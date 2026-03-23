import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { findAllBoardWords } from "@/lib/board/solver";
import type { Board, BoardRow } from "@/lib/board/types";
import { resolveBoardDate } from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = resolveBoardDate(dateParam);

  // Fetch board letters from DB
  const { data: record, error } = await supabaseAdmin
    .from("games")
    .select("letters")
    .eq("date", date)
    .single();

  if (error || !record) {
    return NextResponse.json(
      { status: "error", message: "Board not found" },
      { status: 404 }
    );
  }

  // Reconstruct board from letters
  const letters = record.letters as string;
  const rows: BoardRow[] = [];
  for (let i = 0; i < 5; i++) {
    const rowSlice = letters.slice(i * 5, (i + 1) * 5).split("");
    if (rowSlice.length === 5) {
      rows.push(rowSlice as BoardRow);
    }
  }

  if (rows.length !== 5) {
    return NextResponse.json(
      { status: "error", message: "Invalid board data" },
      { status: 500 }
    );
  }

  const board = rows as Board;
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
