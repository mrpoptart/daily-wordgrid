declare module "wordnet" {
  export interface WordNetResult {
    synsetOffset: number;
    lexFilenum: number;
    pos: string;
    wCnt: number;
    lemma: string;
    synonyms: string[];
    lexId: string;
    pointers: unknown[];
    frames: unknown[];
    gloss: string;
    def: string;
    exp: string;
    glossary: string;
  }

  export default class WordNet {
    constructor(dataDir?: string);
    lookup(word: string): Promise<WordNetResult[]>;
    findSense(word: string, pos?: string): Promise<WordNetResult[]>;
    querySense(synset: string, callback?: (err: Error | null, results: WordNetResult[]) => void): Promise<WordNetResult[]>;
    findSynonyms(word: string): Promise<string[]>;
    lookupFromSynset(synset: string): Promise<WordNetResult[]>;
  }
}
