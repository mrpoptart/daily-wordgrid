"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const STATUS_MESSAGES = {
  idle: "",
  loading: "Sending magic link...",
  oauth: "Redirecting to Google...",
  success: "Check your email for the magic link!",
} as const;

type LoginCardProps = {
  className?: string;
  title?: string;
  description?: string;
  redirectPath?: string;
};

type FormState = keyof typeof STATUS_MESSAGES | "error";

export function LoginCard({
  className,
  title = "Log in",
  description = "",
  redirectPath = "/",
}: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string>("");

  const isDisabled = state === "loading" || state === "oauth" || state === "success";
  const statusMessage = state === "error" ? error : STATUS_MESSAGES[state];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <div className={cn("rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-emerald-500/10", className)}>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        {description && <p className="text-sm text-slate-300">{description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="space-y-2 text-sm font-medium text-slate-200" htmlFor="email">
          <span className="sr-only">Email address</span>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isDisabled}
            required
          />
        </label>

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {state === "loading" ? "Sending..." : "Send Magic Link"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-800" aria-hidden />
          or
          <span className="h-px flex-1 bg-slate-800" aria-hidden />
        </div>

        <Button type="button" variant="outline" className="w-full" disabled={isDisabled} onClick={handleGoogleLogin}>
          Continue with Google
        </Button>
      </div>

      {statusMessage && <p className={cn("mt-4 text-sm", state === "error" ? "text-red-300" : state === "success" ? "text-emerald-300" : "text-slate-300")}>{statusMessage}</p>}
    </div>
  );
}
