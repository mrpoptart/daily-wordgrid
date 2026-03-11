"use client";

import type { WordLengthCounts } from "@/lib/board/solver";

const BUCKETS = ["4", "5", "6", "7", "8+"] as const;

interface WordLengthDistributionProps {
  totalCounts: WordLengthCounts;
  foundCounts: WordLengthCounts;
}

export function WordLengthDistribution({
  totalCounts,
  foundCounts,
}: WordLengthDistributionProps) {
  return (
    <div className="flex w-full items-end justify-center gap-1">
      {BUCKETS.map((bucket) => {
        const total = totalCounts[bucket] ?? 0;
        const found = foundCounts[bucket] ?? 0;
        const allFound = total > 0 && found >= total;

        return (
          <div key={bucket} className="flex flex-col items-center gap-0.5">
            <span
              className={`text-xs tabular-nums ${
                allFound
                  ? "font-semibold text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {found}/{total}
            </span>
            <div
              className={`flex h-7 w-10 items-center justify-center rounded text-xs font-medium ${
                allFound
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {bucket}
            </div>
          </div>
        );
      })}
    </div>
  );
}
