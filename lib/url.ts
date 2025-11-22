import { headers } from "next/headers";

const DEFAULT_FALLBACK_BASE_URL = "http://localhost:3000";

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

/**
 * Attempts to resolve the origin (protocol + host) for the current request.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (preferred in production)
 * 2. Incoming request headers (host + proto)
 * 3. Localhost fallback for dev/test environments
 */
export async function resolveBaseUrl(
  fallback: string = DEFAULT_FALLBACK_BASE_URL,
): Promise<string> {
  const envBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envBaseUrl?.trim()) {
    return stripTrailingSlash(envBaseUrl.trim());
  }

  try {
    const requestHeaders = await headers();
    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const host = requestHeaders.get("host");

    if (forwardedProto && host) {
      return `${forwardedProto}://${host}`;
    }
  } catch (error) {
    console.error("Failed to read request headers for base URL", error);
  }

  return stripTrailingSlash(fallback);
}
