import { cn } from "@/lib/utils";

export type Coordinate = readonly [number, number];

export type BoardPreviewProps = {
  board?: readonly (readonly string[])[];
  highlightPath?: readonly Coordinate[];
  caption?: string;
  footnote?: string | null;
  className?: string;
};

const DEFAULT_BOARD: readonly (readonly string[])[] = [
  ["S", "O", "L", "V", "E"],
  ["R", "A", "T", "E", "S"],
  ["D", "A", "I", "L", "Y"],
  ["W", "O", "R", "D", "L"],
  ["G", "R", "I", "D", "S"],
];

const DEFAULT_HIGHLIGHT: readonly Coordinate[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
];

/**
 * Approximate cell center as a percentage (0–100) within the grid.
 * For 5 equal cells with small gaps, centers fall near 10/30/50/70/90 %.
 */
function cellCenter(index: number): number {
  return index * 20 + 10;
}

export function BoardPreview({
  board = DEFAULT_BOARD,
  highlightPath = DEFAULT_HIGHLIGHT,
  caption = "Sample board",
  footnote,
  className,
}: BoardPreviewProps) {
  const highlighted = new Set(
    highlightPath.map(([row, col]) => `${row}-${col}`),
  );

  const resolvedFootnote =
    footnote ?? (highlightPath.length > 0 ? "Highlighted path forms SOLVE" : null);

  // SVG polyline points for the static connection line
  const polylinePoints = highlightPath
    .map(([row, col]) => `${cellCenter(col)},${cellCenter(row)}`)
    .join(" ");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        {/* SVG connection line overlay — matches the gameplay board */}
        {highlightPath.length >= 2 && (
          <svg
            className="absolute inset-0 z-0 pointer-events-none w-full h-full"
            viewBox="0 0 100 100"
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="rgb(16, 185, 129)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        <div
          role="grid"
          aria-label="Daily Wordgrid preview board"
          className="relative z-10 grid grid-cols-5 gap-1 sm:gap-2"
        >
          {board.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const isHighlighted = highlighted.has(key);
              const isMultiChar = letter.length > 1;
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}: ${letter}${isHighlighted ? " (highlighted path)" : ""}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full border font-bold uppercase",
                    isMultiChar ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
                    isHighlighted
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : "bg-slate-900 text-slate-100 border-white/10",
                  )}
                >
                  {letter}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="text-center text-sm text-slate-300">
        <p>{caption}</p>
        {resolvedFootnote ? (
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
            {resolvedFootnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
