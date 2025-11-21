"use client";

import { useEffect } from "react";

const HASH_KEYS = ["access_token", "refresh_token", "expires_in", "token_type", "type"];

export function LoginRedirectHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextUrl = new URL(window.location.href);
    let shouldReplace = false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hasAuthHash = HASH_KEYS.some((key) => hashParams.has(key));
    if (hasAuthHash) {
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
  }, []);

  return null;
}

