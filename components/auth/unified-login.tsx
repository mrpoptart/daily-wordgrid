"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATUS_MESSAGES = {
  idle: "",
  loading: "Sending magic link...",
  oauth: "Redirecting to Google...",
  success: "Check your email for the magic link!",
} as const;

type FormState = keyof typeof STATUS_MESSAGES | "error";

interface UnifiedLoginProps {
  redirectPath?: string;
  className?: string;
}

export function UnifiedLogin({ redirectPath = "/play", className = "" }: UnifiedLoginProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string>("");

  const isDisabled = state === "loading" || state === "oauth" || state === "success";
  const statusMessage = state === "error" ? error : STATUS_MESSAGES[state];

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      setState("error");
      return;
    }

    try {
      setState("loading");
      setError("");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : undefined,
        },
      });

      if (error) throw error;

      setState("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send the magic link. Try again in a moment.");
      setState("error");
    }
  }

  async function handleGoogleLogin() {
    try {
      setState("oauth");
      setError("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : undefined
        }
      });

      if (error) throw error;

    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't start Google login. Please try again.");
      setState("error");
    }
  }

  return (
    <div className={`card w-full max-w-md bg-slate-900/50 shadow-xl border border-white/10 ${className}`}>
      <div className="card-body p-6">
        <h2 className="card-title text-2xl font-semibold text-white justify-center mb-4">Play now</h2>

        <div className="flex flex-col gap-4">
          {/* Option 1: Guest */}
          <Link
            href="/share"
            className={`btn btn-primary w-full bg-emerald-600 hover:bg-emerald-700 border-none text-white text-lg font-normal normal-case ${isDisabled ? 'btn-disabled' : ''}`}
          >
            Play without logging in
          </Link>

          <div className="divider text-slate-400 text-xs tracking-widest uppercase my-0">Or log in</div>

          {/* Option 2: Google */}
          <button
            type="button"
            className="btn btn-outline w-full border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white normal-case font-normal"
            onClick={handleGoogleLogin}
            disabled={isDisabled}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Option 3: Magic Link */}
          <form onSubmit={handleMagicLink} className="w-full">
            <div className="join w-full">
              <input
                type="email"
                aria-label="Email address"
                className="input input-bordered join-item w-full bg-slate-950/50 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isDisabled}
                required
              />
              <button
                type="submit"
                className="btn join-item bg-slate-700 border-slate-600 text-white hover:bg-slate-600 normal-case font-normal"
                disabled={isDisabled}
              >
                Send Link
              </button>
            </div>
          </form>

          {statusMessage && (
            <div className={`alert ${state === 'error' ? 'alert-error' : state === 'success' ? 'alert-success' : 'alert-info'} py-2 text-sm`}>
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
