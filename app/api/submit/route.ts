import { NextResponse } from "next/server";
import { pb } from "@/lib/pocketbase";
import { resolveBoardDate } from "@/lib/board/api-helpers";

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
    id: string;
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
  if (!Array.isArray(value) || value.length === 0) return null;

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") return null;

    const trimmed = item.trim();
    if (trimmed.length === 0) return null;

    const duplicateKey = trimmed.toLowerCase();
    if (seen.has(duplicateKey)) return null;
    seen.add(duplicateKey);

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
    // Check if submission exists
    // We assume unique constraint on (user_id, date) is enforced by DB or logic
    // PocketBase doesn't have composite unique constraints easily in UI, but we can check.

    // Attempt to find existing submission
    let record;
    try {
        record = await pb.collection('submissions').getFirstListItem(`user_id="${userId}" && date="${date}"`);
    } catch (err: unknown) {
        if ((err as { status?: number }).status !== 404) {
             console.error("Failed to check existing submission", err);
             // proceed to try create, maybe
        }
    }

    if (record) {
        // Update
        record = await pb.collection('submissions').update(record.id, {
            words: JSON.stringify(words),
            score,
        });
    } else {
        // Create
        record = await pb.collection('submissions').create({
            user_id: userId,
            date,
            words: JSON.stringify(words),
            score,
        });
    }

    const body: SubmitSuccessResponse = {
      status: "ok",
      date,
      submission: {
        id: record.id,
        userId: record.user_id, // Note: PB returns fields as snake_case if defined that way? Need to check. Assuming schema uses snake_case keys based on create call.
        words,
        score: record.score,
        createdAt: record.created,
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Failed to record submission", error);
    return errorResponse("database-error", 500);
  }
}
