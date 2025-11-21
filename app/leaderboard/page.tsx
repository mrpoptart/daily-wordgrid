import type { LeaderboardResponse } from "@/app/api/leaderboard/route";
import { LeaderboardContent, LeaderboardUnavailableState } from "@/components/leaderboard/leaderboard-states";
import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardSummary } from "@/components/leaderboard/leaderboard-summary";

const FALLBACK_BASE_URL = "http://localhost:3000";

async function fetchLeaderboard(): Promise<LeaderboardResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || FALLBACK_BASE_URL;
  const endpoint = `${baseUrl}/api/leaderboard`;

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as LeaderboardResponse | { status: string };
    return body.status === "ok" ? body : null;
  } catch (error) {
    console.error("Failed to fetch leaderboard page data", error);
    return null;
  }
}

export default async function LeaderboardPage() {
  const data = await fetchLeaderboard();

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
