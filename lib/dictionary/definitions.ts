import WordNet from "wordnet";

let wordnet: WordNet | null = null;

/**
 * Initialize WordNet (lazy initialization)
 */
function getWordNet(): WordNet {
  if (!wordnet) {
    wordnet = new WordNet();
  }
  return wordnet;
}

export interface WordDefinition {
  word: string;
  definitions: string[];
  partOfSpeech?: string;
}

/**
 * Lookup word definition using WordNet
 * Returns null if no definition is found
 */
export async function lookupDefinition(word: string): Promise<WordDefinition | null> {
  try {
    const wn = getWordNet();
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) return null;

    // Lookup the word in WordNet
    const results = await wn.lookup(normalizedWord);

    if (!results || results.length === 0) {
      return null;
    }

    // Extract definitions from all synsets
    const definitions: string[] = [];
    const partsOfSpeech = new Set<string>();

    for (const result of results) {
      if (result.glossary) {
        // WordNet glossaries often include examples after a semicolon
        // We'll clean this up to show just the definition
        const def = result.glossary.split(';')[0].trim();
        if (def && !definitions.includes(def)) {
          definitions.push(def);
        }
      }

      if (result.pos) {
        partsOfSpeech.add(result.pos);
      }
    }

    if (definitions.length === 0) {
      return null;
    }

    return {
      word: normalizedWord,
      definitions: definitions.slice(0, 3), // Limit to first 3 definitions
      partOfSpeech: Array.from(partsOfSpeech).join(", ")
    };
  } catch (error) {
    console.error("Error looking up word definition:", error);
    return null;
  }
}

