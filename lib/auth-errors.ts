export const BACKEND_UNREACHABLE_MESSAGE =
  "We can't reach the game server right now. Please try again later.";

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/quota-exceeded": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups and try again.",
  "auth/unauthorized-domain": "Sign-in isn't enabled for this site yet.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
};

/** True when the user dismissed the Google popup themselves (not an error worth showing). */
export function isAuthCancellation(cause: unknown): boolean {
  const code = errorCode(cause);
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

/**
 * Turns an error thrown by Firebase Auth into a message safe to show users.
 *
 * Network-level failures (DNS lookup failures, connection resets, offline
 * clients) surface as auth/network-request-failed or a generic
 * "fetch failed" / "Failed to fetch". Those messages are meaningless to
 * players, so they are replaced with a clear outage notice.
 */
export function describeAuthError(cause: unknown, fallback: string): string {
  if (isNetworkError(cause)) return BACKEND_UNREACHABLE_MESSAGE;
  const code = errorCode(cause);
  if (code) return FIREBASE_AUTH_MESSAGES[code] ?? fallback;
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return fallback;
}

function errorCode(cause: unknown): string | null {
  if (!cause || typeof cause !== "object") return null;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" && code.startsWith("auth/") ? code : null;
}

function isNetworkError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false;

  const record = cause as { name?: unknown; message?: unknown; status?: unknown };
  if ((cause as { code?: unknown }).code === 'auth/network-request-failed') return true;
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
