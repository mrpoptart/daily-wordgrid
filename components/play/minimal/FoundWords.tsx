"use client";

import { useRef } from "react";

interface FoundWordsProps {
  wordsWithinTime: { word: string; score: number }[];
  wordsAfterTime: { word: string; score: number }[];
}

export function FoundWords({ wordsWithinTime, wordsAfterTime }: FoundWordsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-100">
          Found Words
        </h3>
        <div
          ref={listRef}
          className="flex max-h-[300px] flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700"
        >
          {wordsWithinTime.length === 0 && wordsAfterTime.length === 0 ? (
            <p className="text-sm italic text-slate-500">No words found yet</p>
          ) : (
            <>
              {wordsWithinTime.map((w, i) => (
                <div key={`within-${i}`} className="flex justify-between py-1 text-sm text-slate-100">
                  <span>{w.word}</span>
                  <span className="text-slate-500">({w.score} pts)</span>
                </div>
              ))}

              {wordsAfterTime.length > 0 && (
                <>
                  <div className="my-2 border-b border-white/10" />
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Overtime
                  </div>
                  {wordsAfterTime.map((w, i) => (
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
      </div>
    </div>
  );
}
