import sowpods from "pf-sowpods";

type SowpodsModule = {
  verify: (word: string) => boolean;
};

/**
 * Case-insensitive SOWPODS verification. Returns false for empty/whitespace.
 */
export function isSowpodsWord(word: string): boolean {
  if (typeof word !== "string") return false;
  const trimmed = word.trim();
  if (trimmed.length === 0) return false;
  // pf-sowpods.verify is case-insensitive
  // It accepts strings like 'banana' and returns true if present
  const verifyFn = (sowpods as unknown as SowpodsModule).verify;
  if (typeof verifyFn !== "function") return false;
  return Boolean(verifyFn(trimmed));
}
