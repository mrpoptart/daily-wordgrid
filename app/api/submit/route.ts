import { NextResponse } from "next/server";
import { resolveBoardDate } from "@/lib/board/api-helpers";
import { scoreWordLength } from "@/lib/scoring";
import { upsertSubmission } from "@/lib/submissions/save";

const MIN_WORD_LENGTH = 4;

export type SubmitRequestBody = {
  userId?: unknown;
  date?: unknown;
  words?: unknown;
};

export type SubmitResponse = {
  status: "ok";
  userId: string;
  date: string;
  words: string[];
  wordCount: number;
  score: number;
};

export type SubmitErrorResponse = {
  status: "error";
  error: "invalid-json" | "invalid-user" | "invalid-words";
};

function sanitizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeWords(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const trimmed = entry.trim();
    if (trimmed.length < MIN_WORD_LENGTH) return null;
    if (!/^[A-Za-z]+$/.test(trimmed)) return null;
    const normalized = trimmed.toUpperCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }

  return unique;
}

function computeScore(words: string[]): number {
  return words.reduce((total, word) => total + scoreWordLength(word.length), 0);
}

export async function POST(req: Request) {
  let body: SubmitRequestBody;
  try {
    body = (await req.json()) as SubmitRequestBody;
  } catch {
    const errorBody: SubmitErrorResponse = { status: "error", error: "invalid-json" };
    return NextResponse.json(errorBody, { status: 400 });
  }

  const userId = sanitizeUserId(body.userId);
  if (!userId) {
    const errorBody: SubmitErrorResponse = { status: "error", error: "invalid-user" };
    return NextResponse.json(errorBody, { status: 400 });
  }

  const words = sanitizeWords(body.words);
  if (!words || words.length === 0) {
    const errorBody: SubmitErrorResponse = { status: "error", error: "invalid-words" };
    return NextResponse.json(errorBody, { status: 400 });
  }

  const dateParam = typeof body.date === "string" ? body.date : null;
  const date = resolveBoardDate(dateParam);
  const score = computeScore(words);

  await upsertSubmission({ userId, date, words, score });

  const responseBody: SubmitResponse = {
    status: "ok",
    userId,
    date,
    words,
    wordCount: words.length,
    score,
  };

  return NextResponse.json(responseBody, { status: 200 });
}
