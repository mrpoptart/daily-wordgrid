import Link from "next/link";
import { BoardPreview } from "@/components/landing/board-preview";
import { Button } from "@/components/ui/button";

const README_URL = "https://github.com/mrpoptart/daily-wordgrid#readme";

const FEATURES = [
  {
    label: "Deterministic",
    title: "One fair board for everyone",
    description:
      "Boards are seeded from the UTC date plus a server-only salt so every player solves the exact same puzzle while preventing spoofing.",
  },
  {
    label: "Validation",
    title: "Server-enforced word paths",
    description:
      "Submitted paths must honor Boggle-style adjacency, minimum length, and a SOWPODS dictionary check before they earn points.",
  },
  {
    label: "Competition",
    title: "Shareable daily scoring",
    description:
      "Scores and word lists are stored per user per day, enabling leaderboards and brag-worthy recap messages in under three minutes.",
  },
] as const;

const FLOW = [
  {
    title: "Log in with Supabase Auth",
    detail: "Lightweight email magic links keep onboarding under 30 seconds.",
  },
  {
    title: "Study today's deterministic board",
    detail: "25 letters, eight-direction adjacency, no tile reuse.",
  },
  {
    title: "Submit words and share your score",
    detail: "Server actions validate every path before persisting score + words.",
  },
] as const;

const SCORING = [
  { label: "4 letters", points: 1 },
  { label: "5 letters", points: 2 },
  { label: "6 letters", points: 3 },
  { label: "7 letters", points: 5 },
  { label: "8+ letters", points: 11 },
] as const;

export default function Home() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 sm:py-20 lg:px-10">
        <header className="space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
            Boggle × Wordle
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Daily Wordgrid
            </h1>
            <p className="text-lg leading-relaxed text-slate-300 sm:text-xl">
              A deterministic 5×5 board that blends the path-finding rush of Boggle with Wordle's "one shot per day" ritual.
              Solve in under three minutes, validate every path server-side, and climb the daily leaderboard.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild className="w-full px-8 sm:w-auto">
              <Link href="/api/board">Preview today's board API</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={README_URL} target="_blank" rel="noreferrer">
                Read the technical plan
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/5">
            <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-emerald-200">Today's grid</p>
                <p className="text-2xl font-semibold text-white">Deterministic seed • 5×5 board</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Session</p>
                <p className="text-3xl font-semibold text-emerald-300">&lt; 3m</p>
                <p className="text-xs text-slate-400">Average play time</p>
              </div>
            </div>
            <BoardPreview className="mx-auto" />
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/15 px-3 py-1">Min word length: 4 letters</span>
              <span className="rounded-full border border-white/15 px-3 py-1">No tile reuse per word</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Eight-direction adjacency</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Scoring</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Reward longer paths</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {SCORING.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <dt className="font-medium text-slate-100">{row.label}</dt>
                    <dd className="text-emerald-300">{row.points} pts</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-slate-400">Same table used by the API + README specs.</p>
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

        <section className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">{feature.label}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
