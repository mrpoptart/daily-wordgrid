import { headers } from "next/headers";

export async function hasSupabaseSessionCookie() {
  let cookieHeader: string | null;

  try {
    cookieHeader = (await headers()).get("cookie");
  } catch {
    return false;
  }
  if (!cookieHeader) return false;

  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [name, ...valueParts] = pair.split("=");
    if (!name || valueParts.length === 0) return acc;

    acc[name.trim()] = valueParts.join("=").trim();
    return acc;
  }, {});

  const authCookieEntry = Object.entries(cookies).find(
    ([name]) => name.startsWith("sb-") && name.endsWith("-auth-token"),
  );

  if (!authCookieEntry) return false;

  const [, value] = authCookieEntry;

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Boolean(parsed?.currentSession?.access_token);
  } catch {
    return false;
  }
}
