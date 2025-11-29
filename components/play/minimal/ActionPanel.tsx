"use client";

import { Timer } from "./Timer";
import { FoundWords } from "./FoundWords";
import { Input } from "@/components/ui/input";
// Button removed as requested

interface ActionPanelProps {
  input: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  scoreWithinTime: number;
  scoreAfterTime: number;
  boardStartedAt: string | null;
  onTimeUp: () => void;
  wordsWithinTime: { word: string; score: number }[];
  wordsAfterTime: { word: string; score: number }[];
  isTimeUp: boolean;
}

export function ActionPanel({
  input,
  inputRef,
  onInputChange,
  onSubmit,
  scoreWithinTime,
  scoreAfterTime,
  boardStartedAt,
  onTimeUp,
  wordsWithinTime,
  wordsAfterTime,
  isTimeUp
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-0">
      <div className="sr-only">
        <label htmlFor="word-input">
          Word
        </label>
        <form onSubmit={onSubmit}>
          <Input
            ref={inputRef}
            id="word-input"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="enter word"
            className="opacity-0 absolute h-1 w-1 -z-10 pointer-events-none"
            autoComplete="off"
            autoFocus
          />
        </form>
      </div>

      <div className="flex items-center justify-between border-y border-[#E0E0E0] py-4">
        <div className="text-sm text-[#1A1A1A]">
          <span className="font-semibold">Score:</span> {scoreWithinTime} pts
          {scoreAfterTime > 0 && (
             <span className="ml-1 text-gray-500">(+{scoreAfterTime})</span>
          )}
        </div>
        <div className="text-sm text-[#1A1A1A]">
          <span className="font-semibold">Time:</span>{" "}
          <Timer boardStartedAt={boardStartedAt} onTimeUp={onTimeUp} />
        </div>
      </div>

      <FoundWords wordsWithinTime={wordsWithinTime} wordsAfterTime={wordsAfterTime} />

      {isTimeUp && (
        <div className="mt-4 rounded border border-[#E0E0E0] bg-gray-50 p-3 text-center text-sm font-semibold text-[#1A1A1A]">
          Time’s Up! You can keep playing.
        </div>
      )}
    </div>
  );
}
