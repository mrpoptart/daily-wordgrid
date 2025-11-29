"use client";

import { Timer } from "./Timer";
import { FoundWords } from "./FoundWords";
import { Button } from "@/components/ui/button";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { cn } from "@/lib/utils";

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
  onVirtualChar: (char: string) => void;
  onVirtualDelete: () => void;
  onVirtualSubmit: () => void;
}

export function ActionPanel({
  input,
  onSubmit,
  scoreWithinTime,
  scoreAfterTime,
  boardStartedAt,
  onTimeUp,
  wordsWithinTime,
  wordsAfterTime,
  isTimeUp,
  onVirtualChar,
  onVirtualDelete,
  onVirtualSubmit,
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-0">
      <div className="flex flex-col gap-2">
        {/* Visual Display of Input */}
        <div className="flex gap-2">
          <div
            className={cn(
              "flex h-10 w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm text-[#1A1A1A]",
              "items-center font-medium uppercase tracking-widest"
            )}
          >
            {input || <span className="text-gray-400 normal-case tracking-normal">Type or click letters...</span>}
            {/* Blinking cursor simulation */}
            <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-[#3A7AFE]"></span>
          </div>
          <Button
            onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
            className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
          >
            Submit
          </Button>
        </div>
      </div>

       {/* Virtual Keyboard - shown on all devices now as it's a good feature, but especially for mobile */}
       <div className="mt-2">
        <VirtualKeyboard
          onChar={onVirtualChar}
          onDelete={onVirtualDelete}
          onSubmit={onVirtualSubmit}
        />
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
