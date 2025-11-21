import type { LeaderboardEntry } from "@/app/api/leaderboard/route";
import { formatSubmittedAt } from "@/lib/leaderboard";

export type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[0.6fr_2fr_1fr_1.2fr] bg-slate-800/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 sm:grid-cols-[0.4fr_2fr_1fr_1fr_1.2fr]">
        <span>Rank</span>
        <span>Player</span>
        <span className="hidden sm:block">Words</span>
        <span>Score</span>
        <span>Submitted</span>
      </div>
      <div className="divide-y divide-white/10 bg-slate-900/80">
        {entries.map((entry) => (
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
  );
}
