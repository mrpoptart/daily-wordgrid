"use client";

import { useEffect } from "react";

const HASH_KEYS = ["access_token", "refresh_token", "expires_in", "token_type", "type"];
const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24; // 24 hours

function getSupabaseProjectRef() {
  if (typeof process === "undefined") return "local";

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return "local";

    const { hostname } = new URL(supabaseUrl);
    return hostname.split(".")[0] || "local";
  } catch {
    return "local";
  }
}

export function LoginRedirectHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextUrl = new URL(window.location.href);
    let shouldReplace = false;
    let shouldRedirectToPlay = false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hasAuthHash = HASH_KEYS.some((key) => hashParams.has(key));

    if (hasAuthHash) {
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const expiresIn = Number(hashParams.get("expires_in") ?? DEFAULT_EXPIRY_SECONDS);
      const tokenType = hashParams.get("token_type") ?? "bearer";
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

      if (accessToken) {
        const cookieName = `sb-${getSupabaseProjectRef()}-auth-token`;
        const payload = {
          currentSession: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
            expires_at: expiresAt,
            token_type: tokenType,
          },
        };

        document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${Math.max(
          expiresIn,
          DEFAULT_EXPIRY_SECONDS,
        )}; sameSite=Lax`;
        shouldRedirectToPlay = true;
      }

      nextUrl.hash = "";
      shouldReplace = true;
    }

    if (nextUrl.searchParams.has("code")) {
      nextUrl.searchParams.delete("code");
      shouldReplace = true;
    }

    if (shouldReplace) {
      window.history.replaceState({}, document.title, nextUrl.toString());
    }

    if (shouldRedirectToPlay) {
      window.location.replace("/play");
    }
  }, []);

  return null;
}

