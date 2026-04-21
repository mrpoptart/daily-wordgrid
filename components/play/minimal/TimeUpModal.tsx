"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  formatSegmentTime,
  segmentBreakdownLines,
  type Segment,
  type SegmentWord,
} from "@/lib/segments";

interface TimeUpModalProps {
  totalScore: number;
  wordsFound: number;
  timeLimit: number;
  segments: Segment<SegmentWord>[];
  onShare: () => void;
  onExtend: () => void;
  onDismiss: () => void;
  isOpen: boolean;
}

export function TimeUpModal({
  totalScore,
  wordsFound,
  timeLimit,
  segments,
  onShare,
  onExtend,
  onDismiss,
  isOpen,
}: TimeUpModalProps) {
  if (!isOpen) return null;

  const breakdown = segmentBreakdownLines(segments);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/50">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">Time&apos;s Up!</h2>
        <p className="mb-4 text-center text-slate-300">
          You found <span className="font-semibold text-white">{wordsFound}</span> words for{" "}
          <span className="font-semibold text-emerald-300">{totalScore}</span> points in{" "}
          <span className="font-semibold text-white">{formatSegmentTime(timeLimit)}</span>!
        </p>

        {breakdown.length > 1 && (
          <div className="mb-5 rounded border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
            {breakdown.map(line => (
              <div key={line.label} className="flex justify-between py-0.5">
                <span className="text-slate-400">{line.label}</span>
                <span>
                  <span className="font-semibold text-emerald-300">{line.score}</span>
                  <span className="text-slate-500"> · {line.wordCount}w</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={onExtend}
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
          >
            +5 more minutes
          </Button>
          <Button
            type="button"
            onClick={onShare}
            className="w-full bg-slate-800 text-white hover:bg-slate-700"
          >
            Share Score
          </Button>
          <Button
            type="button"
            onClick={onDismiss}
            variant="ghost"
            className="w-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            Close
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
