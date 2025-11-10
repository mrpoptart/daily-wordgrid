import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { resolveBoardDate, resolveDailySalt } from "@/lib/board/api-helpers";
import { generateBoardForDate } from "@/lib/board/generate";
import { scoreWordLength } from "@/lib/scoring";
import { validateWordOnBoard } from "@/lib/validation/words";
import { sql } from "drizzle-orm";

type SubmitRequestBody = {
  userId?: unknown;
  date?: string | null;
  words?: unknown;
  score?: unknown;
};

export type SubmitSuccessResponse = {
  status: "ok";
  date: string;
  submission: {
    id: number;
    userId: string;
    words: string[];
    score: number;
    createdAt: string | null;
  };
};

type SubmitError =
  | "invalid-json"
  | "invalid-user"
  | "invalid-words"
  | "database-error";

export type SubmitErrorResponse = {
  status: "error";
  error: SubmitError;
};

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWords(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (trimmed.length === 0) return null;
    normalized.push(trimmed.toUpperCase());
  }
  return normalized;
}

function errorResponse(error: SubmitError, status = 400) {
  const body: SubmitErrorResponse = { status: "error", error };
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let payload: SubmitRequestBody;
  try {
    payload = (await req.json()) as SubmitRequestBody;
  } catch {
    return errorResponse("invalid-json", 400);
  }

  const userId = normalizeUserId(payload.userId);
  if (!userId) {
    return errorResponse("invalid-user", 400);
  }

  const words = normalizeWords(payload.words);
  if (!words) {
    return errorResponse("invalid-words", 400);
  }

  const date = resolveBoardDate(typeof payload.date === "string" ? payload.date : null);
  const { salt } = resolveDailySalt();
  const board = generateBoardForDate(date, salt);

  const uniqueWords: string[] = [];
  const seen = new Set<string>();
  for (const word of words) {
    const upper = word.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    uniqueWords.push(upper);
  }

  const validatedWords: string[] = [];
  let derivedScore = 0;

  for (const word of uniqueWords) {
    const check = validateWordOnBoard(board, word);
    if (!check.ok || !check.word) {
      return errorResponse("invalid-words", 400);
    }
    validatedWords.push(check.word);
    derivedScore += scoreWordLength(check.word.length);
  }

  try {
    const result = await db
      .insert(submissions)
      .values({
        userId,
        date,
        words: JSON.stringify(validatedWords),
        score: derivedScore,
      })
      .onConflictDoUpdate({
        target: [submissions.userId, submissions.date],
        set: {
          words: sql`excluded.words`,
          score: sql`excluded.score`,
        },
      })
      .returning();

    const record = result[0];
    if (!record) {
      return errorResponse("database-error", 500);
    }

    const body: SubmitSuccessResponse = {
      status: "ok",
      date,
      submission: {
        id: record.id,
        userId: record.userId,
        words: validatedWords,
        score: record.score,
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : null,
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Failed to record submission", error);
    return errorResponse("database-error", 500);
  }
}
