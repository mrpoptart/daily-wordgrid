"use client";

import { FormEvent, useState } from "react";
import { sendSupabaseMagicLink } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_MESSAGES = {
  idle: "Enter your email to receive a magic link.",
  loading: "Sending a secure magic link...",
  success: "Magic link sent! Check your inbox to continue.",
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
  description = "Use a Supabase magic link to start playing.",
  redirectPath = "/",
}: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string>("");

  const isDisabled = state === "loading";
  const statusMessage = state === "error" ? error : STATUS_MESSAGES[state];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      setState("error");
      return;
    }

    try {
      setState("loading");
      setError("");
      await sendSupabaseMagicLink({
        email,
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined,
      });
      setState("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't start the login flow. Try again in a moment.");
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

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {state === "loading" ? "Sending magic link..." : "Send magic link"}
        </Button>
      </form>

      <p className={cn("mt-4 text-sm", state === "error" ? "text-red-300" : "text-slate-300")}>{statusMessage}</p>
    </div>
  );
}
