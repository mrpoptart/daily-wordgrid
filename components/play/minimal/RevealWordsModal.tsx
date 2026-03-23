"use client";

import { Button } from "@/components/ui/button";

interface RevealWordsModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevealWordsModal({ isOpen, onConfirm, onCancel }: RevealWordsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/50">
        <h2 className="mb-2 text-center text-xl font-bold text-white">Show Remaining Words?</h2>
        <p className="mb-6 text-center text-slate-300">
          This will reveal all words on the board and{" "}
          <span className="font-semibold text-white">prevent additional word finding</span> for today.
        </p>

        <div className="flex gap-3">
          <Button type="button" onClick={onCancel} className="flex-1 bg-slate-800 text-white hover:bg-slate-700">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600">
            Reveal Words
          </Button>
        </div>
      </div>
    </div>
  );
}
