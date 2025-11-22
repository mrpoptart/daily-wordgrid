import { ReactNode } from "react";
import type { LeaderboardResponse } from "@/app/api/leaderboard/route";
import { LeaderboardTable } from "./leaderboard-table";

export function LeaderboardContent({ data }: { data: LeaderboardResponse }) {
  if (data.entries.length === 0) {
    return (
      <StatePanel>
        <p className="font-semibold text-white">No submissions yet today.</p>
        <p className="text-sm text-slate-300">Be the first to climb the board!</p>
      </StatePanel>
    );
  }

  return <LeaderboardTable entries={data.entries} />;
}

export function LeaderboardUnavailableState() {
  return (
    <StatePanel>
      <p className="text-lg font-semibold text-white">Leaderboard unavailable</p>
      <p className="mt-2 text-sm text-slate-300">
        We couldn’t load today’s standings. Please retry later or check your connection.
      </p>
    </StatePanel>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center space-y-2">
      {children}
    </div>
  );
}
