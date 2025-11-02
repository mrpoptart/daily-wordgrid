import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { resolveBoardDate } from "@/lib/board/api-helpers";
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
  | "invalid-score"
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
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizeScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const floored = Math.floor(value);
  return floored >= 0 ? floored : null;
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

  const score = normalizeScore(payload.score);
  if (score === null) {
    return errorResponse("invalid-score", 400);
  }

  const date = resolveBoardDate(typeof payload.date === "string" ? payload.date : null);

  try {
    const result = await db
      .insert(submissions)
      .values({
        userId,
        date,
        words: JSON.stringify(words),
        score,
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
        words,
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
