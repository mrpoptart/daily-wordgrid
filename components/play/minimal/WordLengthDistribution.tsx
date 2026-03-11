"use client";

import type { WordLengthCounts } from "@/lib/board/solver";

const BUCKETS = ["4", "5", "6", "7", "8+"] as const;

const RING_SIZE = 52;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ARC_ROTATION = -90;

const BUCKET_COLORS: Record<string, string> = {
  "4": "#34d399",   // emerald-400
  "5": "#2dd4bf",   // teal-400
  "6": "#38bdf8",   // sky-400
  "7": "#a78bfa",   // violet-400
  "8+": "#f472b6",  // pink-400
};

interface WordLengthDistributionProps {
  totalCounts: WordLengthCounts;
  foundCounts: WordLengthCounts;
}

function RingProgress({
  bucket,
  total,
  found,
}: {
  bucket: string;
  total: number;
  found: number;
}) {
  const remaining = Math.max(0, total - found);
  const progress = total > 0 ? found / total : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = BUCKET_COLORS[bucket] ?? "#94a3b8";
  const isComplete = total > 0 && remaining === 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          {/* Background track */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-slate-800"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress arc */}
          {total > 0 && (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(${ARC_ROTATION} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              className="transition-all duration-500 ease-out"
              opacity={isComplete ? 0.3 : 1}
            />
          )}
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-sm font-bold tabular-nums ${
              isComplete ? "text-slate-600" : "text-slate-100"
            }`}
          >
            {remaining}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-slate-500">{bucket}</span>
    </div>
  );
}

export function WordLengthDistribution({
  totalCounts,
  foundCounts,
}: WordLengthDistributionProps) {
  return (
    <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
      {BUCKETS.map((bucket) => {
        const total = totalCounts[bucket] ?? 0;
        const found = foundCounts[bucket] ?? 0;

        return (
          <RingProgress
            key={bucket}
            bucket={bucket}
            total={total}
            found={found}
          />
        );
      })}
    </div>
  );
}
