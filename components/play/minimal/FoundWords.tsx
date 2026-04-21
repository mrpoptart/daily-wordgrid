"use client";

import { useMemo, useRef } from "react";
import { WordList } from "./WordList";
import { scoreWordLength } from "@/lib/scoring";
import {
  formatSegmentTime,
  type Segment,
  type SegmentWord,
} from "@/lib/segments";

function wordLengthBucket(word: string): string {
  const len = word.length;
  if (len <= 7) return String(len);
  return "8+";
}

interface FoundWordsProps {
  segments: Segment<SegmentWord>[];
  revealedWords?: string[] | null;
  onRevealWords?: () => void;
  selectedLengthBuckets?: Set<string>;
}

export function FoundWords({ segments, revealedWords, onRevealWords, selectedLengthBuckets }: FoundWordsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const hasFilter = !!selectedLengthBuckets && selectedLengthBuckets.size > 0;

  const allFoundWords = useMemo(
    () => segments.flatMap(s => s.words),
    [segments]
  );

  const filteredSegments = useMemo(() => {
    if (!hasFilter) return segments;
    return segments.map(s => {
      const words = s.words.filter(w => selectedLengthBuckets!.has(wordLengthBucket(w.word)));
      return {
        ...s,
        words,
        score: words.reduce((sum, w) => sum + w.score, 0),
      };
    });
  }, [segments, hasFilter, selectedLengthBuckets]);

  const filteredAllFoundWords = useMemo(
    () => filteredSegments.flatMap(s => s.words),
    [filteredSegments]
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

  const filteredAllWordsDisplay = useMemo(() => {
    if (!allWordsDisplay) return null;
    if (!hasFilter) return allWordsDisplay;
    return allWordsDisplay.filter(w => selectedLengthBuckets!.has(wordLengthBucket(w.word)));
  }, [allWordsDisplay, hasFilter, selectedLengthBuckets]);

  const nonEmptySegments = filteredSegments.filter(s => s.words.length > 0);
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
          ) : filteredAllFoundWords.length === 0 ? (
            <p className="text-sm italic text-slate-500">
              {hasFilter ? "No words of this length" : "No words found yet"}
            </p>
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
            <WordList words={filteredAllFoundWords} emptyMessage="" />
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
