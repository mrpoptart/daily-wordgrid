import Link from "next/link";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";
import { BoardPreview } from "@/components/landing/board-preview";
import { Button } from "@/components/ui/button";

const LOGIN_URL = "/login";

const FLOW = [
  {
    title: "Log in",
    detail: "Use your email or Google account.",
  },
  {
    title: "Find words",
    detail: "Connect letters in any direction.",
  },
  {
    title: "Share score",
    detail: "Compare with others on the leaderboard.",
  },
] as const;

const SCORING = [
  { label: "4 letters", points: 1 },
  { label: "5 letters", points: 2 },
  { label: "6 letters", points: 3 },
  { label: "7 letters", points: 5 },
  { label: "8+ letters", points: 11 },
] as const;

export default async function Home() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <AuthRedirect />
      <UserLastLoginUpdater />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 sm:py-20 lg:px-10">
        <header className="space-y-6 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Daily Wordgrid
            </h1>
            <p className="text-lg leading-relaxed text-slate-300 sm:text-xl">
              Find as many words as you can in 5 minutes. Everyone plays the same board. One chance per day.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild className="w-full px-8 sm:w-auto">
              <Link href={LOGIN_URL}>Play Now</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/5">
            <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-semibold text-white">Connect letters to form words</p>
              </div>
            </div>
            <BoardPreview
              className="mx-auto"
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Scoring</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Reward longer words</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {SCORING.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <dt className="font-medium text-slate-100">{row.label}</dt>
                    <dd className="text-emerald-300">{row.points} pts</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Daily flow</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Three steps to play</h2>
              <ol className="mt-4 space-y-4">
                {FLOW.map((step, index) => (
                  <li key={step.title} className="flex gap-4 text-left">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-200">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{step.title}</p>
                      <p className="text-sm text-slate-300">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
