import { cookies } from "next/headers";

export async function hasSupabaseSessionCookie() {
  const authCookie = (await cookies())
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
