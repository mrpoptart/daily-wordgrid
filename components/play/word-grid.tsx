"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Board } from "@/lib/board/types";
import type { Coord } from "@/lib/validation/adjacency";
import { areAdjacent } from "@/lib/validation/adjacency";
import { scoreWordLength } from "@/lib/scoring";
import { assembleWord, validateWord } from "@/lib/validation/words";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";

export type WordGridProps = {
  board: Board;
};

type Status =
  | { tone: "muted"; message: string }
  | { tone: "error"; message: string }
  | { tone: "success"; message: string };

type AddedWord = { word: string; score: number };

function isSameCoord(a: Coord, b: Coord): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function WordGrid({ board }: WordGridProps) {
  const [path, setPath] = useState<Coord[]>([]);
  const [words, setWords] = useState<AddedWord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "muted",
    message: "Tap adjacent letters to build a path.",
  });

  const hasDraggedRef = useRef(false);
  const latestPathRef = useRef<Coord[]>([]);
  const pendingSubmitRef = useRef(false);
  const skipClickRef = useRef(false);

  const currentWord = useMemo(() => assembleWord(board, path), [board, path]);

  const totalScore = useMemo(
    () => words.reduce((sum, entry) => sum + entry.score, 0),
    [words],
  );

  function resetPath(nextStatus?: Status) {
    setPath([]);
    latestPathRef.current = [];
    pendingSubmitRef.current = false;
    hasDraggedRef.current = false;
    skipClickRef.current = false;
    if (nextStatus) setStatus(nextStatus);
  }

  function submitPath(targetPath: Coord[]) {
    pendingSubmitRef.current = false;
    const validation = validateWord(board, targetPath);
    if (!validation.ok) {
      if (validation.reason === "too-short") {
        setStatus({
          tone: "error",
          message: `Use at least ${MIN_PATH_LENGTH} letters before adding a word.`,
        });
        return;
      }

      if (validation.reason === "invalid-path") {
        setStatus({
          tone: "error",
          message: "Invalid path—each step must be adjacent with no re-use.",
        });
        return;
      }

      if (validation.reason === "not-in-dictionary") {
        setStatus({
          tone: "error",
          message: `${validation.word ?? "That"} isn't in the SOWPODS word list.`,
        });
        return;
      }

      setStatus({ tone: "error", message: "Unable to add that word." });
      return;
    }

    const word = validation.word ?? assembleWord(board, targetPath);
    const normalized = word.toLowerCase();
    if (words.some((entry) => entry.word.toLowerCase() === normalized)) {
      setStatus({ tone: "error", message: "You've already added that word today." });
      return;
    }

    const score = scoreWordLength(word.length);
    setWords((prev) => [...prev, { word, score }]);
    resetPath({ tone: "success", message: `Added ${word} (+${score} pts).` });
  }

  function handleSelect(row: number, col: number, options?: { autoSubmit?: boolean }) {
    const next: Coord = [row, col];

    if (path.length === 0) {
      setPath([next]);
      latestPathRef.current = [next];
      setStatus({ tone: "muted", message: "Keep tapping adjacent letters." });
      return;
    }

    const lastCoord = path[path.length - 1];
    const shouldAutoSubmit = options?.autoSubmit === true;

    if (isSameCoord(lastCoord, next)) {
      latestPathRef.current = path;
      if (shouldAutoSubmit) {
        pendingSubmitRef.current = true;
        if (path.length >= MIN_PATH_LENGTH) {
          submitPath(path);
        }
      }
      return;
    }

    if (path.some((coord) => isSameCoord(coord, next))) {
      setStatus({ tone: "error", message: "You already used that tile." });
      return;
    }

    if (!areAdjacent(lastCoord, next)) {
      setStatus({ tone: "error", message: "Tiles must touch (including diagonals)." });
      return;
    }

    const nextPath = [...path, next];
    setPath(nextPath);
    latestPathRef.current = nextPath;
    setStatus({ tone: "muted", message: "Nice—now add or keep extending." });

    if (shouldAutoSubmit) {
      pendingSubmitRef.current = true;
      if (nextPath.length >= MIN_PATH_LENGTH) {
        submitPath(nextPath);
      }
    }
  }

  function handleUndo() {
    setPath((prev) => prev.slice(0, -1));
    setStatus({ tone: "muted", message: "Removed the last letter." });
  }

  function handleAddWord() {
    submitPath(path);
  }

  useEffect(() => {
    if (!pendingSubmitRef.current) return;
    if (path.length < MIN_PATH_LENGTH) return;

    pendingSubmitRef.current = false;
    submitPath(path);
  }, [path]);

  useEffect(() => {
    if (words.length === 0) return;

    setPath([]);
    latestPathRef.current = [];
    hasDraggedRef.current = false;
    skipClickRef.current = false;
  }, [words.length]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-emerald-500/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Build a word</p>
            <p className="text-lg font-semibold text-white">Tap to select adjacent letters</p>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">
            {path.length} / {MIN_PATH_LENGTH}+ letters
          </div>
        </div>

        <div
          role="grid"
          aria-label="Interactive daily board"
          className="grid grid-cols-5 gap-3"
        >
          {board.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const coord: Coord = [rowIndex, colIndex];
              const isSelected = path.some((item) => isSameCoord(item, coord));

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}: ${letter}${
                    isSelected ? " (selected)" : ""
                  }`}
                  onPointerDown={() => {
                    setIsDragging(true);
                    hasDraggedRef.current = false;
                    handleSelect(rowIndex, colIndex);
                  }}
                  onPointerEnter={() => {
                    if (!isDragging) return;
                    hasDraggedRef.current = true;
                    handleSelect(rowIndex, colIndex);
                  }}
                  onPointerUp={() => {
                    setIsDragging(false);
                    pendingSubmitRef.current = true;
                    const currentPath = latestPathRef.current;
                    if (currentPath.length >= MIN_PATH_LENGTH) {
                      submitPath(currentPath);
                    }

                    skipClickRef.current = true;
                  }}
                  onClick={() => {
                    if (skipClickRef.current) {
                      skipClickRef.current = false;
                      return;
                    }

                    handleSelect(rowIndex, colIndex, { autoSubmit: true });
                  }}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border text-xl font-semibold tracking-[0.1em] transition",
                    "border-white/10 bg-white/5 text-white/90 hover:border-emerald-300/50 hover:bg-emerald-500/10",
                    isSelected &&
                      "border-emerald-400/70 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40",
                  )}
                >
                  {letter}
                </button>
              );
            }),
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current word</p>
            <p className="text-2xl font-semibold text-white">{currentWord || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={path.length === 0}
              className={cn(
                "rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition",
                "hover:border-white/20 hover:bg-white/5",
                path.length === 0 && "cursor-not-allowed opacity-50",
              )}
            >
              Undo letter
            </button>
            <button
              type="button"
              onClick={() => resetPath({ tone: "muted", message: "Path cleared." })}
              disabled={path.length === 0}
              className={cn(
                "rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition",
                "hover:border-white/20 hover:bg-white/5",
                path.length === 0 && "cursor-not-allowed opacity-50",
              )}
            >
              Clear path
            </button>
            <button
              type="button"
              onClick={handleAddWord}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Add word
            </button>
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            status.tone === "muted" && "border-white/10 bg-slate-900/70 text-slate-200",
            status.tone === "error" && "border-red-500/60 bg-red-500/10 text-red-100",
            status.tone === "success" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-50",
          )}
          role="status"
        >
          {status.message}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Your words</p>
            <p className="text-lg font-semibold text-white">{words.length} added</p>
          </div>
          <div className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Total score: {totalScore}
          </div>
        </div>

        {words.length === 0 ? (
          <p className="text-sm text-slate-300">
            Added words will appear here with their point values.
          </p>
        ) : (
          <ul className="space-y-2">
            {words.map((entry) => (
              <li
                key={entry.word}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white"
              >
                <span className="font-semibold uppercase tracking-[0.2em]">{entry.word}</span>
                <span className="text-sm text-emerald-200">+{entry.score} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
