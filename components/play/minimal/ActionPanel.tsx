"use client";

import { Timer } from "./Timer";
import { FoundWords } from "./FoundWords";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ActionPanelProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  score: number;
  boardStartedAt: string | null;
  onTimeUp: () => void;
  words: { word: string; score: number }[];
  isTimeUp: boolean;
}

export function ActionPanel({
  input,
  onInputChange,
  onSubmit,
  score,
  boardStartedAt,
  onTimeUp,
  words,
  isTimeUp
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-0">
      <div className="flex flex-col gap-2">
        <label htmlFor="word-input" className="text-sm font-medium text-[#1A1A1A]">
          Word
        </label>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            id="word-input"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="enter word"
            className="border-[#E0E0E0] bg-white text-[#1A1A1A] placeholder:text-gray-400 focus-visible:ring-[#3A7AFE] focus-visible:ring-offset-0"
            autoComplete="off"
            disabled={isTimeUp}
            autoFocus
          />
          <Button
            type="submit"
            className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
            disabled={isTimeUp}
          >
            Submit
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-between border-y border-[#E0E0E0] py-4">
        <div className="text-sm text-[#1A1A1A]">
          <span className="font-semibold">Score:</span> {score} pts
        </div>
        <div className="text-sm text-[#1A1A1A]">
          <span className="font-semibold">Time:</span>{" "}
          <Timer boardStartedAt={boardStartedAt} onTimeUp={onTimeUp} />
        </div>
      </div>

      <FoundWords words={words} />

      {isTimeUp && (
        <div className="mt-4 rounded border border-[#E0E0E0] bg-gray-50 p-3 text-center text-sm font-semibold text-[#1A1A1A]">
          Time’s Up!
        </div>
      )}
    </div>
  );
}
