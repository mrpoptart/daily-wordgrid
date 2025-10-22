/*
 Build script: Download and normalize the SOWPODS word list into
 lib/dictionary/sowpods.set.json (array of unique uppercase words).

 Usage:
   npm run build:dict

 Optional env:
   SOWPODS_URL   - override source URL
*/

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

const DEFAULT_URLS: string[] = [
  // Multiple mirrors for resilience (first one known-good as of 2025)
  "https://raw.githubusercontent.com/jmlewis/valett/master/scrabble/sowpods.txt",
  "https://raw.githubusercontent.com/jesstess/Scrabble/master/sowpods.txt",
  "https://raw.githubusercontent.com/wordnik/scrabble-cheat/master/sowpods.txt",
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function getSowpodsText(): Promise<string> {
  const override = process.env.SOWPODS_URL?.trim();
  const candidates = override ? [override] : DEFAULT_URLS;
  let lastError: unknown;
  for (const url of candidates) {
    try {
      // eslint-disable-next-line no-console
      console.log(`Attempting download: ${url}`);
      const txt = await fetchText(url);
      if (!txt || !txt.trim()) throw new Error("empty response");
      return txt;
    } catch (err) {
      lastError = err;
      // eslint-disable-next-line no-console
      console.warn(`Failed: ${url} -> ${(err as Error).message}`);
    }
  }

  // Fallback to local asset if present
  const localAsset = join(repoRoot, "assets", "sowpods.txt");
  if (existsSync(localAsset)) {
    // eslint-disable-next-line no-console
    console.log(`Using local asset fallback: ${localAsset}`);
    return readFileSync(localAsset, "utf8");
  }

  throw new Error(`Unable to fetch SOWPODS from sources. Last error: ${String(lastError)}`);
}

function normalizeToSet(raw: string): string[] {
  const set = new Set<string>();
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const word = line.trim().toUpperCase();
    if (!word) continue;
    if (!/^[A-Z]+$/.test(word)) continue; // keep strict A–Z only
    set.add(word);
  }
  return Array.from(set).sort();
}

async function main() {
  const txt = await getSowpodsText();
  const words = normalizeToSet(txt);
  const outDir = join(repoRoot, "lib", "dictionary");
  const outFile = join(outDir, "sowpods.set.json");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(words, null, 0) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${words.length.toLocaleString()} words → ${outFile.replace(repoRoot + "/", "")}`,
  );
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
