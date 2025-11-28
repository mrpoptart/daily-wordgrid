import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchBoard } from "@/lib/board/fetch";
import { WordGrid } from "@/components/play/word-grid";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

export const metadata = {
  title: "Today's board • Daily Wordgrid",
  description: "View the deterministic 5×5 board for today's puzzle.",
};

export const dynamic = 'force-dynamic';

export default async function PlayPage() {
  // Client-side auth check is better for Supabase in this context, or use middleware
  // For now, removing the server-side redirect based on session cookie
  // We can add a client-side component to check auth status and redirect if needed

  const boardData = await fetchBoard();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <UserLastLoginUpdater />
      <div className="flex items-center justify-center border-b border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">
        Logged in
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <header className="space-y-4 text-center lg:text-left">
          <p className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
            Daily Wordgrid
          </p>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Today's board</h1>
            <p className="text-lg text-slate-300 sm:text-xl">
              You're logged in—jump straight into today's deterministic puzzle and start finding paths.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild>
              <Link href="/leaderboard">View leaderboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/api/board">Inspect board API</Link>
            </Button>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/10">
          {boardData ? (
            <div className="space-y-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Deterministic seed</p>
                  <p className="text-2xl font-semibold text-white">Daily board for {boardData.date}</p>
                  <p className="text-sm text-slate-300">
                    Boards refresh at 00:00 UTC so every player sees the same letters.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Salted</p>
                  <p className="text-lg font-semibold text-emerald-300">
                    {boardData.env.hasDailySalt ? "Yes" : "Missing"}
                  </p>
                  <p className="text-xs text-slate-400">BOARD_DAILY_SALT{boardData.env.hasDailySalt ? " set" : " unset"}</p>
                </div>
              </div>

              <WordGrid board={boardData.board} />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">How scoring works</p>
                <p className="mt-1 text-slate-300">
                  Minimum word length is 4 letters. Longer paths earn more points (4 → 1, 5 → 2, 6 → 3, 7 → 5, 8+ → 11). Tiles
                  can only be used once per word, and each step must be adjacent (including diagonals).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-lg font-semibold text-white">We couldn't load today's board.</p>
              <p className="text-sm text-slate-300">
                Try again in a moment or verify the <Link className="underline" href="/api/board">/api/board</Link> endpoint is reachable.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
