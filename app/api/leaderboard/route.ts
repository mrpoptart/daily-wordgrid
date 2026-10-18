import { NextResponse } from "next/server";

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

type LeaderboardError = "invalid-limit" | "unavailable";

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
  const limitParam = url.searchParams.get("limit");

  const limit = resolveLimit(limitParam);

  if (limit === "invalid") {
    return errorResponse("invalid-limit", 400);
  }

  // No score store exists yet (scores were never persisted under Supabase either),
  // so the leaderboard reports itself unavailable rather than an empty board.
  return errorResponse("unavailable", 503);
}
