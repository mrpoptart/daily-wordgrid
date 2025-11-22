const FALLBACK_BASE_URL = "http://localhost:3000";

function cleanUrl(value: string | undefined | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.replace(/\/$/, "");
}

type HeaderSource = { get(name: string): string | null };

export async function resolveBaseUrl(
  headersProvider?: () => HeaderSource | Promise<HeaderSource>,
): Promise<string> {
  const fromEnv = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;

  try {
    const headers = await headersProvider?.();
    const host = cleanUrl(headers?.get("x-forwarded-host") ?? headers?.get("host"));
    if (!host) return FALLBACK_BASE_URL;

    const protocol = cleanUrl(headers?.get("x-forwarded-proto")) ?? "https";
    return `${protocol}://${host}`;
  } catch (error) {
    console.error("Failed to resolve base URL", error);
    return FALLBACK_BASE_URL;
  }
}
