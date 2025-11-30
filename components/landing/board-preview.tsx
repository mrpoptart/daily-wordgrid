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

export function BoardPreview({
  board = DEFAULT_BOARD,
  highlightPath = DEFAULT_HIGHLIGHT,
  caption = "Sample board seeded from 2025-01-02",
  footnote,
  className,
}: BoardPreviewProps) {
  const highlighted = new Set(
    highlightPath.map(([row, col]) => `${row}-${col}`),
  );

  const resolvedFootnote = footnote;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="grid"
        aria-label="Daily Wordgrid preview board"
        className="grid grid-cols-5 gap-3"
      >
        {board.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const isHighlighted = highlighted.has(key);
            return (
              <div
                key={key}
                role="gridcell"
                aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}: ${letter}${isHighlighted ? " (highlighted path)" : ""}`}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-semibold tracking-[0.1em]",
                  isHighlighted
                    ? "border-emerald-400/70 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                    : "border-white/10 bg-white/5 text-white/90",
                )}
              >
                {letter}
              </div>
            );
          }),
        )}
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
