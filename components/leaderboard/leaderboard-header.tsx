import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LeaderboardHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Leaderboard</p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Daily standings</h1>
        <p className="text-sm text-slate-300">Rankings for today’s deterministic board.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Back to landing</Link>
        </Button>
        <Button asChild>
          <Link href="/">Log in to play</Link>
        </Button>
      </div>
    </header>
  );
}
