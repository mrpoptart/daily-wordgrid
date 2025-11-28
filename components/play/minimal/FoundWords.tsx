"use client";

import { useEffect, useRef } from "react";

interface FoundWordsProps {
  wordsWithinTime: { word: string; score: number }[];
  wordsAfterTime: { word: string; score: number }[];
}

export function FoundWords({ wordsWithinTime, wordsAfterTime }: FoundWordsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when either list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wordsWithinTime, wordsAfterTime]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="border-b border-[#E0E0E0] pb-2 text-sm font-semibold uppercase tracking-wider text-[#1A1A1A]">
          Found Words
        </h3>
        <div className="flex max-h-[300px] flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
          {wordsWithinTime.length === 0 && wordsAfterTime.length === 0 ? (
            <p className="text-sm italic text-gray-400">No words found yet</p>
          ) : (
            <>
              {wordsWithinTime.map((w, i) => (
                <div key={`within-${i}`} className="flex justify-between py-1 text-sm text-[#1A1A1A]">
                  <span>{w.word}</span>
                  <span className="text-gray-500">({w.score} pts)</span>
                </div>
              ))}

              {wordsAfterTime.length > 0 && (
                <>
                  <div className="my-2 border-b border-[#E0E0E0]" />
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Overtime
                  </div>
                  {wordsAfterTime.map((w, i) => (
                    <div key={`after-${i}`} className="flex justify-between py-1 text-sm text-gray-500">
                      <span>{w.word}</span>
                      <span>({w.score} pts)</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
