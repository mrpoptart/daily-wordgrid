const FIRESTORE_HINTS: Record<string, string> = {
  "permission-denied": "The database refused this request (security rules).",
  unauthenticated: "You're signed out. Log out and sign in again.",
  unavailable: "Can't reach the database. Check your connection.",
  "deadline-exceeded": "The database took too long to respond.",
  "not-found": "The database or record wasn't found.",
  "failed-precondition": "The database isn't set up for this request.",
  "resource-exhausted": "Database quota exceeded.",
};

/**
 * Turns a Firestore error into a short, user-visible explanation that keeps the
 * raw error code, so problems can be diagnosed without a browser console.
 */
export function describeDbError(error: unknown): string {
  const record = (error && typeof error === "object" ? error : {}) as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code.replace(/^firestore\//, "") : null;
  const message =
    typeof record.message === "string" && record.message.trim()
      ? record.message.replace(/^FirebaseError:\s*/, "").trim()
      : error instanceof Error
        ? error.message
        : String(error ?? "Unknown error");

  const hint = code ? FIRESTORE_HINTS[code] : undefined;
  if (hint) return `${hint} [${code}]`;
  if (code) return `${message} [${code}]`;
  return message;
}
