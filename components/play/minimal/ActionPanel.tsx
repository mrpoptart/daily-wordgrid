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
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onShare?: () => void;
  userEmail: string | null;
  onLogout: () => void;
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
  inputRef,
  onShare,
  userEmail,
  onLogout
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
            className="border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
            autoComplete="off"
            autoFocus
          />
          <Button
            type="submit"
            className="bg-emerald-500 text-white hover:bg-emerald-600"
          >
            Submit
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-between border-y border-white/10 py-4">
        <div className="flex-1 text-left text-sm text-slate-100">
          <span className="font-semibold text-emerald-300">Score:</span> {scoreWithinTime} pts
          {scoreAfterTime > 0 && (
             <span className="ml-1 text-slate-500">(+{scoreAfterTime})</span>
          )}
        </div>
        <div className="flex flex-1 justify-center items-center gap-2 text-sm text-slate-100">
          <span className="font-semibold text-emerald-300">Time:</span>{" "}
          <Timer boardStartedAt={boardStartedAt} onTimeUp={onTimeUp} />
        </div>
        <div className="flex flex-1 justify-end">
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Share"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              <span>Share</span>
            </button>
          )}
        </div>
      </div>

      <FoundWords wordsWithinTime={wordsWithinTime} wordsAfterTime={wordsAfterTime} />

      {userEmail && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded border border-white/10 bg-slate-900/50 p-4 text-sm sm:flex-row">
          <div className="text-slate-400">
            Logged in as <span className="font-medium text-slate-100">{userEmail}</span>
          </div>
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="h-8 text-slate-400 hover:text-white hover:bg-white/10"
          >
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}
