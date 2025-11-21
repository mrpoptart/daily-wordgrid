import Link from "next/link";
import type { LeaderboardEntry, LeaderboardResponse } from "@/app/api/leaderboard/route";

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

function formatSubmittedAt(entry: LeaderboardEntry): string {
  if (!entry.submittedAt) return "–";
  const parsed = new Date(entry.submittedAt);
  if (Number.isNaN(parsed.getTime())) return "–";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeaderboardPage() {
  const data = await fetchLeaderboard();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Leaderboard</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Daily standings</h1>
            <p className="text-sm text-slate-300">Rankings for today’s deterministic board.</p>
          </div>
          <div className="flex gap-3">
            <Link
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/70 hover:text-emerald-200"
              href="/"
            >
              Back to landing
            </Link>
            <Link
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              href="/login"
            >
              Log in to play
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/10">
          {data ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    Showing top {data.entries.length} of {data.totalPlayers} players for {data.date}
                  </p>
                  <p className="text-xs text-slate-400">Limits enforced server-side for fairness.</p>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-emerald-200">Limit {data.limit}</span>
              </div>

              {data.entries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-slate-300">
                  No submissions yet today. Be the first to climb the board!
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[0.6fr_2fr_1fr_1.2fr] bg-slate-800/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 sm:grid-cols-[0.4fr_2fr_1fr_1fr_1.2fr]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="hidden sm:block">Words</span>
                    <span>Score</span>
                    <span>Submitted</span>
                  </div>
                  <div className="divide-y divide-white/10 bg-slate-900/80">
                    {data.entries.map((entry) => (
                      <div
                        key={`${entry.userId}-${entry.rank}-${entry.score}`}
                        className="grid grid-cols-[0.6fr_2fr_1fr_1.2fr] items-center px-4 py-3 text-sm text-slate-100 sm:grid-cols-[0.4fr_2fr_1fr_1fr_1.2fr]"
                      >
                        <span className="font-semibold text-emerald-200">{entry.rank}</span>
                        <div className="space-y-1">
                          <p className="font-medium text-white">{entry.userId}</p>
                          <p className="text-xs text-slate-400 sm:hidden">
                            {entry.words.length} words • {formatSubmittedAt(entry)}
                          </p>
                        </div>
                        <span className="hidden text-slate-300 sm:block">{entry.words.length}</span>
                        <span className="font-semibold text-emerald-200">{entry.score}</span>
                        <span className="text-xs text-slate-300">{formatSubmittedAt(entry)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center">
              <p className="text-lg font-semibold text-white">Leaderboard unavailable</p>
              <p className="mt-2 text-sm text-slate-300">
                We couldn’t load today’s standings. Please retry later or check your connection.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
