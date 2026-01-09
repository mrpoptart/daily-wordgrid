/**
 * Get a formatted part of speech label
 */
export function formatPartOfSpeech(pos?: string): string {
  if (!pos) return "";

  const posMap: Record<string, string> = {
    "n": "noun",
    "v": "verb",
    "a": "adjective",
    "s": "adjective satellite",
    "r": "adverb"
  };

  return pos.split(",").map(p => posMap[p.trim()] || p).join(", ");
}
