"use client";

import { useMemo, useRef } from "react";
import { WordList } from "./WordList";
import { scoreWordLength } from "@/lib/scoring";

function wordLengthBucket(word: string): string {
  const len = word.length;
  if (len <= 7) return String(len);
  return "8+";
}

interface FoundWordsProps {
  wordsWithinTime: { word: string; score: number }[];
  wordsAfterTime: { word: string; score: number }[];
  revealedWords?: string[] | null;
  onRevealWords?: () => void;
  selectedLengthBuckets?: Set<string>;
}

export function FoundWords({ wordsWithinTime, wordsAfterTime, revealedWords, onRevealWords, selectedLengthBuckets }: FoundWordsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const hasFilter = selectedLengthBuckets && selectedLengthBuckets.size > 0;

  const filteredWithinTime = useMemo(
    () => hasFilter ? wordsWithinTime.filter(w => selectedLengthBuckets.has(wordLengthBucket(w.word))) : wordsWithinTime,
    [wordsWithinTime, hasFilter, selectedLengthBuckets]
  );
  const filteredAfterTime = useMemo(
    () => hasFilter ? wordsAfterTime.filter(w => selectedLengthBuckets.has(wordLengthBucket(w.word))) : wordsAfterTime,
    [wordsAfterTime, hasFilter, selectedLengthBuckets]
  );

  // Build the combined word list when revealed
  const allWordsDisplay = useMemo(() => {
    if (!revealedWords) return null;

    const foundSet = new Set<string>();
    wordsWithinTime.forEach(w => foundSet.add(w.word.toUpperCase()));
    wordsAfterTime.forEach(w => foundSet.add(w.word.toUpperCase()));

    return revealedWords
      .map(word => ({
        word,
        score: scoreWordLength(word.length),
        found: foundSet.has(word.toUpperCase()),
      }))
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [revealedWords, wordsWithinTime, wordsAfterTime]);

  const filteredAllWordsDisplay = useMemo(() => {
    if (!allWordsDisplay) return null;
    if (!hasFilter) return allWordsDisplay;
    return allWordsDisplay.filter(w => selectedLengthBuckets!.has(wordLengthBucket(w.word)));
  }, [allWordsDisplay, hasFilter, selectedLengthBuckets]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-100">
          {revealedWords ? "All Words" : "Found Words"}
        </h3>
        <div
          ref={listRef}
          className="flex max-h-[300px] flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700"
        >
          {revealedWords && filteredAllWordsDisplay ? (
            <>
              {filteredAllWordsDisplay.map((w, i) => (
                <div
                  key={`revealed-${i}`}
                  className={`flex justify-between py-1 text-sm ${
                    w.found ? "text-slate-100" : "text-slate-500 italic"
                  }`}
                >
                  <span>{w.word}</span>
                  <span className={w.found ? "text-slate-500" : "text-slate-600"}>
                    ({w.score} pts)
                  </span>
                </div>
              ))}
              <div className="mt-2 text-xs text-slate-500">
                {filteredAllWordsDisplay.filter(w => w.found).length} / {filteredAllWordsDisplay.length} words found
              </div>
            </>
          ) : filteredWithinTime.length === 0 && filteredAfterTime.length === 0 ? (
            <p className="text-sm italic text-slate-500">
              {hasFilter ? "No words of this length" : "No words found yet"}
            </p>
          ) : (
            <>
              <WordList words={filteredWithinTime} emptyMessage="" />

              {filteredAfterTime.length > 0 && (
                <>
                  <div className="my-2 border-b border-white/10" />
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Overtime
                  </div>
                  {filteredAfterTime.map((w, i) => (
                    <div key={`after-${i}`} className="flex justify-between py-1 text-sm text-slate-500">
                      <span>{w.word}</span>
                      <span>({w.score} pts)</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {!revealedWords && onRevealWords && (
          <button
            onClick={onRevealWords}
            className="mt-2 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          >
            Show Remaining Words
          </button>
        )}
      </div>
    </div>
  );
}
