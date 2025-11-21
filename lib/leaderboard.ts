import type { LeaderboardEntry } from "@/app/api/leaderboard/route";

export function formatSubmittedAt(entry: LeaderboardEntry): string {
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
