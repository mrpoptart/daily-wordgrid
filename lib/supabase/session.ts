import { cookies } from "next/headers";

export function hasSupabaseSessionCookie() {
  const authCookie = cookies()
    .getAll()
    .find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

  if (!authCookie?.value) return false;

  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    return Boolean(parsed?.currentSession?.access_token);
  } catch {
    return false;
  }
}
