import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type BoardWordCountsDoc, type GameDoc } from "@/lib/db-schema";
import { generateBoardForDate } from "@/lib/board/generate";
import { findAllBoardWords, computeWordLengthCounts, type WordLengthCounts } from "@/lib/board/solver";
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
  const seed = createHash("sha256").update(`${date}|${salt}`).digest("hex");

  let board: Board;
  let letters: string;

  try {
    // Try to fetch existing game from Firestore
    const snapshot = await adminDb.collection(COLLECTIONS.games).doc(date).get();
    const record = snapshot.exists ? (snapshot.data() as GameDoc) : null;

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
        // create() fails if the doc exists, like the former unique constraint
        await adminDb.collection(COLLECTIONS.games).doc(date).create({
            date,
            letters,
            seed,
            created_at: FieldValue.serverTimestamp(),
        });
      } catch (createError: unknown) {
        // If create fails (e.g. duplicate because of race condition), ignore or log
        // If it's a unique constraint violation, it means another request created it, which is fine.
        console.error("Failed to persist daily board", createError);
      }
  }

  // Fetch or compute word length counts
  let wordLengthCounts: WordLengthCounts;
  let cached: BoardWordCountsDoc | null = null;
  try {
    const snapshot = await adminDb.collection(COLLECTIONS.boardWordCounts).doc(date).get();
    cached = snapshot.exists ? (snapshot.data() as BoardWordCountsDoc) : null;
  } catch (error) {
    console.error("Failed to read cached word counts:", error);
  }

  if (cached) {
    wordLengthCounts = {
      "4": cached.count_4,
      "5": cached.count_5,
      "6": cached.count_6,
      "7": cached.count_7,
      "8+": cached.count_8_plus,
    };
  } else {
    const allWords = findAllBoardWords(board);
    wordLengthCounts = computeWordLengthCounts(allWords);

    // Persist to DB (fire-and-forget, ignore errors from race conditions)
    adminDb
      .collection(COLLECTIONS.boardWordCounts)
      .doc(date)
      .create({
        board_date: date,
        total_words: allWords.length,
        count_4: wordLengthCounts["4"],
        count_5: wordLengthCounts["5"],
        count_6: wordLengthCounts["6"],
        count_7: wordLengthCounts["7"],
        count_8_plus: wordLengthCounts["8+"],
        created_at: FieldValue.serverTimestamp(),
      })
      .catch((error) => {
        console.error("Failed to cache word counts:", error);
      });
  }

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
