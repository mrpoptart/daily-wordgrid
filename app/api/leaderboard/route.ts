import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, timestampToIso, type SubmissionDoc } from "@/lib/db-schema";
import { resolveBoardDate } from "@/lib/board/api-helpers";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function resolveLimit(raw: string | null | undefined): number | "invalid" {
  if (raw == null) {
    return DEFAULT_LIMIT;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return DEFAULT_LIMIT;
  }

  if (!/^\d+$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > MAX_LIMIT) {
    return "invalid";
  }

  return parsed;
}

function parseWordsField(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const words: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          words.push(trimmed);
        }
      }
    }
    return words;
  } catch {
    return [];
  }
}

function formatSubmittedAt(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function normalizeUserId(value: unknown): string {
  if (typeof value !== "string") {
    return "unknown";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

function normalizeScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  const coerced = Number(value);
  if (!Number.isFinite(coerced)) {
    return 0;
  }

  return Math.max(0, Math.floor(coerced));
}

type LeaderboardError = "invalid-limit" | "database-error";

export type LeaderboardErrorResponse = {
  status: "error";
  error: LeaderboardError;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  score: number;
  words: string[];
  submittedAt: string | null;
};

export type LeaderboardResponse = {
  status: "ok";
  date: string;
  limit: number;
  totalPlayers: number;
  entries: LeaderboardEntry[];
};

function errorResponse(error: LeaderboardError, status: number) {
  const body: LeaderboardErrorResponse = { status: "error", error };
  return NextResponse.json(body, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const limitParam = url.searchParams.get("limit");

  // Ignore timezone params and headers
  const date = resolveBoardDate(dateParam);
  const limit = resolveLimit(limitParam);

  if (limit === "invalid") {
    return errorResponse("invalid-limit", 400);
  }

  try {
    // Fetch submissions for the date
    // Sort by score (desc), created_at (asc) in memory: one doc per player per day
    const snapshot = await adminDb
        .collection(COLLECTIONS.submissions)
        .where('date', '==', date)
        .get();

    const allRows = snapshot.docs
        .map((d) => d.data() as SubmissionDoc)
        .map((row) => ({ ...row, created_at: timestampToIso(row.created_at) }));
    allRows.sort((a, b) =>
        normalizeScore(b.score) - normalizeScore(a.score) ||
        (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    const rows = allRows.slice(0, limit);

    const totalPlayers = snapshot.size;

    let lastRank = 0;
    let lastScore: number | null = null;

    const entries: LeaderboardEntry[] = (rows || []).map((row, index) => {
      const normalizedScore = normalizeScore(row.score);

      const rank = lastScore !== null && normalizedScore === lastScore ? lastRank : index + 1;
      lastScore = normalizedScore;
      lastRank = rank;

      return {
        rank,
        userId: normalizeUserId(row.user_id),
        score: normalizedScore,
        words: parseWordsField(row.words),
        submittedAt: formatSubmittedAt(row.created_at),
      };
    });

    const body: LeaderboardResponse = {
      status: "ok",
      date,
      limit,
      totalPlayers,
      entries,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch leaderboard", error);
    return errorResponse("database-error", 500);
  }
}
