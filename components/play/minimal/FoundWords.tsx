"use client";

import { useEffect, useRef } from "react";

interface FoundWordsProps {
  words: { word: string; score: number }[];
}

export function FoundWords({ words }: FoundWordsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [words]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="border-b border-[#E0E0E0] pb-2 text-sm font-semibold uppercase tracking-wider text-[#1A1A1A]">
        Found Words
      </h3>
      <div className="flex max-h-[300px] flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
        {words.length === 0 ? (
          <p className="text-sm italic text-gray-400">No words found yet</p>
        ) : (
          words.map((w, i) => (
            <div key={i} className="flex justify-between py-1 text-sm text-[#1A1A1A]">
              <span>{w.word}</span>
              <span className="text-gray-500">({w.score} pts)</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
