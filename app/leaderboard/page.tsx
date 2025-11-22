import { headers } from "next/headers";
import type {
  LeaderboardErrorResponse,
  LeaderboardResponse,
} from "@/app/api/leaderboard/route";
import { LeaderboardContent, LeaderboardUnavailableState } from "@/components/leaderboard/leaderboard-states";
import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardSummary } from "@/components/leaderboard/leaderboard-summary";

const FALLBACK_BASE_URL = "http://localhost:3000";

type LeaderboardSearchParams = {
  date?: string;
};

function isIsoDate(value?: string | null): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

async function fetchLeaderboard(params?: LeaderboardSearchParams): Promise<LeaderboardResponse | null> {
  const envBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  let runtimeBaseUrl: string | null = null;
  try {
    const requestHeaders = headers();
    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const host = requestHeaders.get("host");

    if (forwardedProto && host) {
      runtimeBaseUrl = `${forwardedProto}://${host}`;
    }
  } catch (error) {
    console.error("Failed to read request headers for base URL", error);
  }

  const baseUrl = envBaseUrl || runtimeBaseUrl || FALLBACK_BASE_URL;
  const endpoint = new URL(`${baseUrl}/api/leaderboard`);

  if (isIsoDate(params?.date)) {
    endpoint.searchParams.set("date", params?.date);
  }

  try {
    const res = await fetch(endpoint.toString(), { cache: "no-store" });
    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as
      | LeaderboardResponse
      | LeaderboardErrorResponse;

    if (body.status === "ok") {
      return body;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch leaderboard page data", error);
    return null;
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: LeaderboardSearchParams;
}) {
  const data = await fetchLeaderboard(searchParams);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <LeaderboardHeader />

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/10">
          {data ? (
            <div className="space-y-4">
              <LeaderboardSummary
                date={data.date}
                entries={data.entries}
                limit={data.limit}
                totalPlayers={data.totalPlayers}
              />
              <LeaderboardContent data={data} />
            </div>
          ) : (
            <LeaderboardUnavailableState />
          )}
        </section>
      </div>
    </div>
  );
}
