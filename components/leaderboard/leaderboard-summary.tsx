import type { LeaderboardResponse } from "@/app/api/leaderboard/route";

type LeaderboardSummaryProps = Pick<
  LeaderboardResponse,
  "entries" | "totalPlayers" | "date" | "limit"
>;

export function LeaderboardSummary({ entries, totalPlayers, date, limit }: LeaderboardSummaryProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-slate-300">
          Showing top {entries.length} of {totalPlayers} players for {date}
        </p>
        <p className="text-xs text-slate-400">Limits enforced server-side for fairness.</p>
      </div>
      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-emerald-200">Limit {limit}</span>
    </div>
  );
}
