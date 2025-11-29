import type { BoardResponse } from "@/app/api/board/route";
import {
  flattenBoard,
  resolveBoardDate,
  resolveDailySalt,
} from "@/lib/board/api-helpers";
import { generateBoardForDate } from "@/lib/board/generate";
import { resolveBaseUrl } from "@/lib/url";

const FALLBACK_BASE_URL = "http://localhost:3000";

export async function fetchBoard({
  timeZone,
}: { timeZone?: string | null } = {}): Promise<BoardResponse | null> {
  const baseUrl = await resolveBaseUrl(FALLBACK_BASE_URL);
  const endpoint = new URL(`${baseUrl}/api/board`);
  if (timeZone?.trim()) {
    endpoint.searchParams.set("tz", timeZone.trim());
  }

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as BoardResponse;
      if (body.status === "ok") return body;
    }
  } catch (error) {
    console.error("Failed to load daily board", error);
  }

  return buildLocalBoardResponse(timeZone);
}

function buildLocalBoardResponse(timeZone?: string | null): BoardResponse {
  const date = resolveBoardDate(null, timeZone);
  const { salt, hasDailySalt } = resolveDailySalt();
  const board = generateBoardForDate(date, salt);

  return {
    status: "ok",
    date,
    board,
    letters: flattenBoard(board),
    env: {
      hasDailySalt,
    },
  };
}
