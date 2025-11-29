import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateBoardForDate } from "@/lib/board/generate";
import type { Board, BoardRow } from "@/lib/board/types";
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

  let board: Board;
  let letters: string;

  try {
    // Try to fetch existing game from Supabase
    const { data: record, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
        console.error("Failed to fetch game from Supabase", error);
        throw error;
    }

    if (record) {
        letters = record.letters;
        // Reconstruct board from letters
        // Assuming 5x5
        const rows: BoardRow[] = [];
        for (let i = 0; i < 5; i++) {
            const rowSlice = letters.slice(i * 5, (i + 1) * 5).split('');
            if (rowSlice.length === 5) {
                 rows.push(rowSlice as BoardRow);
            }
        }
        if (rows.length === 5) {
            board = rows as Board;
        } else {
            throw new Error("Invalid board data");
        }
    } else {
        throw new Error("Not found");
    }

  } catch {
      // If not found, generate and try to save
      board = generateBoardForDate(date, salt);
      letters = flattenBoard(board);

      try {
        await supabaseAdmin.from('games').insert({
            date,
            letters,
            seed
        });
      } catch (createError: unknown) {
        // If create fails (e.g. duplicate because of race condition), ignore or log
        // If it's a unique constraint violation, it means another request created it, which is fine.
        console.error("Failed to persist daily board", createError);
      }
  }

  const body: BoardResponse = {
    status: "ok",
    date,
    board,
    letters,
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
