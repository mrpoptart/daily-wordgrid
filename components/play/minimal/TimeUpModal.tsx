"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

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
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/50">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">Time's Up!</h2>
        <p className="mb-6 text-center text-slate-300">
          You found <span className="font-semibold text-white">{wordsFound}</span> words for <span className="font-semibold text-emerald-300">{score}</span> points!
        </p>

        <div className="flex flex-col gap-3">
          <Button type="button" onClick={onShare} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
            Share Score
          </Button>
          <Button type="button" onClick={onKeepPlaying} className="w-full bg-slate-800 text-white hover:bg-slate-700">
            Keep Playing
          </Button>
          <Link
            href="/share"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Start a Shareable Game
          </Link>
        </div>
      </div>
    </div>
  );
}
