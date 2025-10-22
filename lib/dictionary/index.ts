import sowpods from "pf-sowpods";

/**
 * Case-insensitive SOWPODS verification. Returns false for empty/whitespace.
 */
export function isSowpodsWord(word: string): boolean {
  if (typeof word !== "string") return false;
  const trimmed = word.trim();
  if (trimmed.length === 0) return false;
  // pf-sowpods.verify is case-insensitive
  // It accepts strings like 'banana' and returns true if present
  return Boolean((sowpods as any)?.verify?.(trimmed));
}
