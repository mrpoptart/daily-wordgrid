import type { BoardResponse } from "@/app/api/board/route";
import { resolveBaseUrl } from "@/lib/url";

const FALLBACK_BASE_URL = "http://localhost:3000";

export async function fetchBoard(): Promise<BoardResponse | null> {
  const baseUrl = await resolveBaseUrl(FALLBACK_BASE_URL);
  const endpoint = `${baseUrl}/api/board`;

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return null;

    const body = (await res.json()) as BoardResponse;
    return body.status === "ok" ? body : null;
  } catch (error) {
    console.error("Failed to load daily board", error);
    return null;
  }
}
