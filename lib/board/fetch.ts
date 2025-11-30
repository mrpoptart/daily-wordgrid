import type { BoardResponse } from "@/app/api/board/route";
import {
  flattenBoard,
  resolveBoardDate,
  resolveDailySalt,
} from "@/lib/board/api-helpers";
import { generateBoardForDate } from "@/lib/board/generate";
import { resolveBaseUrl } from "@/lib/url";

const FALLBACK_BASE_URL = "http://localhost:3000";

export async function fetchBoard(): Promise<BoardResponse | null> {
  const baseUrl = await resolveBaseUrl(FALLBACK_BASE_URL);
  const endpoint = new URL(`${baseUrl}/api/board`);

  // We no longer send tz parameter, so it defaults to server default (ET)

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as BoardResponse;
      if (body.status === "ok") return body;
    }
  } catch (error) {
    console.error("Failed to load daily board", error);
  }

  return buildLocalBoardResponse();
}

function buildLocalBoardResponse(): BoardResponse {
  const date = resolveBoardDate(null);
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
