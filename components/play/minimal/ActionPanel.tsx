"use client";

import { Timer } from "./Timer";
import { FoundWords } from "./FoundWords";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ActionPanelProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  scoreWithinTime: number;
  scoreAfterTime: number;
  boardStartedAt: string | null;
  onTimeUp: () => void;
  wordsWithinTime: { word: string; score: number }[];
  wordsAfterTime: { word: string; score: number }[];
  isTimeUp: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ActionPanel({
  input,
  onInputChange,
  onSubmit,
  scoreWithinTime,
  scoreAfterTime,
  boardStartedAt,
  onTimeUp,
  wordsWithinTime,
  wordsAfterTime,
  isTimeUp,
  inputRef
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 md:p-0">
      <div className="flex flex-col gap-2">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            id="word-input"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="enter word"
            className="border-[#E0E0E0] bg-white text-[#1A1A1A] placeholder:text-gray-400 focus-visible:ring-[#3A7AFE] focus-visible:ring-offset-0"
            autoComplete="off"
            autoFocus
          />
          <Button
            type="submit"
            className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
          >
            Submit
          </Button>
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
