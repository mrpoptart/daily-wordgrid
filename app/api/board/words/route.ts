import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type GameDoc } from "@/lib/db-schema";
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
  let record: GameDoc | null = null;
  try {
    const snapshot = await adminDb.collection(COLLECTIONS.games).doc(date).get();
    record = snapshot.exists ? (snapshot.data() as GameDoc) : null;
  } catch (error) {
    console.error("Failed to fetch board:", error);
  }

  if (record) {
    const letters = record.letters;
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

    adminDb
      .collection(COLLECTIONS.games)
      .doc(date)
      .create({ date, letters, seed, created_at: FieldValue.serverTimestamp() })
      .catch((error) => {
        console.error("Failed to persist board:", error);
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
