"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const STATUS_MESSAGES = {
  idle: "Enter your email to receive a magic link.",
  loading: "Logging in...",
  oauth: "Redirecting to Google...",
  success: "Login successful!",
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
  description = "Use Supabase Auth to start playing.",
  redirectPath = "/",
}: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string>("");

  const isDisabled = state === "loading" || state === "oauth";
  const statusMessage = state === "error" ? error : STATUS_MESSAGES[state];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      setState("error");
      return;
    }

    try {
      setState("loading");
      setError("");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setState("success");
      // Redirect or refresh
      if (typeof window !== "undefined") {
        window.location.href = redirectPath;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't log you in. Try again in a moment.");
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
        <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Supabase Auth</p>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-300">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="space-y-2 text-sm font-medium text-slate-200" htmlFor="email">
          Email address
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
        <label className="space-y-2 text-sm font-medium text-slate-200" htmlFor="password">
          Password
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isDisabled}
            required
          />
        </label>

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {state === "loading" ? "Logging in..." : "Log in"}
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

      <p className={cn("mt-4 text-sm", state === "error" ? "text-red-300" : "text-slate-300")}>{statusMessage}</p>
    </div>
  );
}
