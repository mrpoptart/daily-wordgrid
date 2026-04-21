"use client";

import { useMemo, useRef } from "react";
import { WordList } from "./WordList";
import { scoreWordLength } from "@/lib/scoring";
import {
  formatSegmentTime,
  type Segment,
  type SegmentWord,
} from "@/lib/segments";

interface FoundWordsProps {
  segments: Segment<SegmentWord>[];
  revealedWords?: string[] | null;
  onRevealWords?: () => void;
}

export function FoundWords({ segments, revealedWords, onRevealWords }: FoundWordsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const allFoundWords = useMemo(
    () => segments.flatMap(s => s.words),
    [segments]
  );

  // Build the combined word list when revealed
  const allWordsDisplay = useMemo(() => {
    if (!revealedWords) return null;

    const foundSet = new Set<string>();
    allFoundWords.forEach(w => foundSet.add(w.word.toUpperCase()));

    return revealedWords
      .map(word => ({
        word,
        score: scoreWordLength(word.length),
        found: foundSet.has(word.toUpperCase()),
      }))
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [revealedWords, allFoundWords]);

  const nonEmptySegments = segments.filter(s => s.words.length > 0);
  const showSegmentHeaders = segments.length > 1;

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
          {revealedWords && allWordsDisplay ? (
            <>
              {allWordsDisplay.map((w, i) => (
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
                {allWordsDisplay.filter(w => w.found).length} / {allWordsDisplay.length} words found
              </div>
            </>
          ) : allFoundWords.length === 0 ? (
            <p className="text-sm italic text-slate-500">No words found yet</p>
          ) : showSegmentHeaders ? (
            nonEmptySegments.map((seg, idx) => (
              <div key={`seg-${seg.index}`}>
                {idx > 0 && <div className="my-2 border-b border-white/10" />}
                <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>
                    {formatSegmentTime(seg.startSec)}–{formatSegmentTime(seg.endSec)}
                  </span>
                  <span>{seg.score} pts</span>
                </div>
                <WordList words={seg.words} emptyMessage="" />
              </div>
            ))
          ) : (
            <WordList words={allFoundWords} emptyMessage="" />
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
