"use client";

import { Button } from "@/components/ui/button";

interface TimeUpModalProps {
  score: number;
  wordsFound: number;
  onShare: () => void;
  onKeepPlaying: () => void;
  isOpen: boolean;
}

export function TimeUpModal({ score, wordsFound, onShare, onKeepPlaying, isOpen }: TimeUpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">Time's Up!</h2>
        <p className="mb-6 text-center text-gray-600">
          You found <span className="font-semibold text-black">{wordsFound}</span> words for <span className="font-semibold text-black">{score}</span> points!
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={onShare} className="w-full bg-[#1A1A1A] text-white hover:bg-[#333333]">
            Share Score
          </Button>
          <Button onClick={onKeepPlaying} className="w-full bg-[#1A1A1A] text-white hover:bg-[#333333]">
            Keep Playing
          </Button>
        </div>
      </div>
    </div>
  );
}
