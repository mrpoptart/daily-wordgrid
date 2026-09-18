export const BACKEND_UNREACHABLE_MESSAGE =
  "We can't reach the game server right now. Please try again later.";

/**
 * Turns an error thrown by supabase-js auth into a message safe to show users.
 *
 * Network-level failures (DNS lookup failures, connection resets, a paused or
 * deleted Supabase project) surface from supabase-js as a generic
 * "fetch failed" / "Failed to fetch" / AuthRetryableFetchError. Those messages
 * are meaningless to players, so they are replaced with a clear outage notice.
 */
export function describeAuthError(cause: unknown, fallback: string): string {
  if (isNetworkError(cause)) return BACKEND_UNREACHABLE_MESSAGE;
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return fallback;
}

function isNetworkError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false;

  const record = cause as { name?: unknown; message?: unknown; status?: unknown };
  if (record.name === 'AuthRetryableFetchError') return true;
  if (typeof record.message !== 'string') return false;

  const message = record.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  );
}
