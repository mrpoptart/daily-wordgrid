"use client";

import { WordDefinitionPopup } from "../WordDefinitionPopup";

interface WordListProps {
  words: { word: string; score: number }[];
  emptyMessage?: string;
  className?: string;
}

export function WordList({ words, emptyMessage = "No words found yet", className = "" }: WordListProps) {
  return (
    <div className={className}>
      {words.length === 0 ? (
        <p className="text-sm italic text-slate-500">{emptyMessage}</p>
      ) : (
        <>
          {words.map((w, i) => (
            <div key={`word-${i}`} className="flex justify-between py-1 text-sm text-slate-100">
              <WordDefinitionPopup word={w.word}>
                <button className="hover:text-emerald-300 transition-colors cursor-pointer text-left">
                  {w.word}
                </button>
              </WordDefinitionPopup>
              <span className="text-slate-500">({w.score} pts)</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
