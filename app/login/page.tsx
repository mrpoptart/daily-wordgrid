import Link from "next/link";
import { LoginCard } from "@/components/auth/login-card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Log in • Daily Wordgrid",
  description: "Log in with Supabase to play today's board.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-16 lg:flex-row lg:items-start lg:gap-16 lg:px-10">
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <p className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
            Daily Wordgrid
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Log in to play</h1>
            <p className="text-lg leading-relaxed text-slate-300 sm:text-xl">
              Enter your email to receive a magic link, or continue with Google.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild className="px-6">
              <Link href="/">Back to landing</Link>
            </Button>
            <Button asChild variant="secondary" className="px-6">
              <Link href="/api/board">Preview today's board API</Link>
            </Button>
          </div>
        </div>

          <div className="flex-1 w-full max-w-md">
            <LoginCard
              title="Sign in"
              description="Use your email for a magic link."
              redirectPath="/play"
            />
          </div>
        </div>
      </div>
  );
}
