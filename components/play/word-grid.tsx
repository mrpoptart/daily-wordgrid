"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Board } from "@/lib/board/types";
import type { Coord } from "@/lib/validation/adjacency";
import { areAdjacent } from "@/lib/validation/adjacency";
import { scoreWordLength } from "@/lib/scoring";
import {
  assembleWord,
  findPathForWord,
  validateWord,
} from "@/lib/validation/words";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";
import { Input } from "@/components/ui/input";

export type WordGridProps = {
  board: Board;
  boardDate: string;
};

type Status =
  | { tone: "muted"; message: string }
  | { tone: "error"; message: string }
  | { tone: "success"; message: string };

type AddedWord = { word: string; score: number; timestamp?: string };

function isSameCoord(a: Coord, b: Coord): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function WordGrid({ board, boardDate }: WordGridProps) {
  const [path, setPath] = useState<Coord[]>([]);
  const [words, setWords] = useState<AddedWord[]>([]);
  const [boardStartedAt, setBoardStartedAt] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Fetch words
        supabase
          .from("words")
          .select("word, score, created_at")
          .eq("user_id", data.user.id)
          .eq("board_date", boardDate)
          .order("created_at", { ascending: true })
          .then(({ data: fetchedWords, error }) => {
            if (error) {
              console.error("Failed to fetch words:", error);
              return;
            }
            if (fetchedWords) {
              setWords((prev) => {
                // Merge fetched words with existing state to avoid overwriting user progress
                // Create a map of existing words for quick lookup
                const existingMap = new Map(
                  prev.map((w) => [w.word.toLowerCase(), w]),
                );

                // Add all fetched words
                fetchedWords.forEach((fw) => {
                  if (!existingMap.has(fw.word.toLowerCase())) {
                    existingMap.set(fw.word.toLowerCase(), {
                      word: fw.word,
                      score: fw.score,
                      timestamp: fw.created_at,
                    });
                  }
                });

                // Convert back to array
                return Array.from(existingMap.values());
              });
            }
          });

        // Fetch board start time
        supabase
          .from("daily_boards")
          .select("board_started")
          .eq("user_id", data.user.id)
          .eq("board_date", boardDate)
          .single()
          .then(({ data: boardData }) => {
            if (boardData) {
              setBoardStartedAt(boardData.board_started);
            }
          });
      }
    });
  }, [boardDate]);

  const pendingSubmitRef = useRef(false);
  const [typedWord, setTypedWord] = useState("");
  const [status, setStatus] = useState<Status>({
    tone: "muted",
    message: "Tap adjacent letters to build a path.",
  });

  function updatePendingSubmit(next: boolean) {
    pendingSubmitRef.current = next;
  }

  const latestPathRef = useRef<Coord[]>([]);

  const currentWord = useMemo(() => assembleWord(board, path), [board, path]);

  const totalScore = useMemo(
    () => words.reduce((sum, entry) => sum + entry.score, 0),
    [words],
  );

  const { first5MinWords, after5MinWords } = useMemo(() => {
    // If we don't know when the board started yet, treat all words as "within 5 mins" (or just show them)
    // Actually, if boardStartedAt is null, we can't really split. But usually words > 0 implies boardStartedAt exists.
    // We'll return all in first bucket if boardStartedAt is missing.
    if (!boardStartedAt) {
      return { first5MinWords: words, after5MinWords: [] };
    }

    const startTime = new Date(boardStartedAt).getTime();
    const cutoff = startTime + 5 * 60 * 1000;

    const first: AddedWord[] = [];
    const after: AddedWord[] = [];

    words.forEach((w) => {
      // If timestamp is missing for some reason, default to 0 (old) which is likely wrong if board started recently.
      // But purely optimistic words have timestamp = now. Fetched words have created_at.
      const t = w.timestamp ? new Date(w.timestamp).getTime() : 0;
      if (t <= cutoff) {
        first.push(w);
      } else {
        after.push(w);
      }
    });

    return { first5MinWords: first, after5MinWords: after };
  }, [words, boardStartedAt]);

  function resetPath(nextStatus?: Status) {
    setPath([]);
    latestPathRef.current = [];
    updatePendingSubmit(false);
    if (nextStatus) setStatus(nextStatus);
  }

  async function submitPath(targetPath: Coord[]) {
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
    const now = new Date().toISOString();

    // Optimistic update
    setWords((prev) => [...prev, { word, score, timestamp: now }]);
    resetPath({ tone: "success", message: `Added ${word} (+${score} pts).` });

    // Background save
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      if (words.length === 0) {
        // Optimistically set boardStartedAt if not already set
        if (!boardStartedAt) {
          setBoardStartedAt(now);
        }

        supabase
          .from("daily_boards")
          .upsert(
            {
              user_id: data.user.id,
              board_date: boardDate,
              board_started: now,
            },
            { onConflict: "user_id, board_date", ignoreDuplicates: true },
          )
          .then(({ error }) => {
            if (error) {
              console.error("Failed to track board start:", error);
            }
          });
      }

      // Save the word to the database
      const { error: insertError } = await supabase.from("words").insert({
        user_id: data.user.id,
        board_date: boardDate,
        word,
        score,
      });

      if (insertError) {
        console.error("Failed to save word:", insertError);
        setStatus({ tone: "error", message: "Failed to save word." });

        // Revert the optimistic update if save fails
        setWords((prev) => prev.filter((w) => w.word !== word));
        return;
      }
    }
  }

  function handleSelect(row: number, col: number, options?: { autoSubmit?: boolean }) {
    const next: Coord = [row, col];

    if (typedWord) {
      setTypedWord("");
    }

    if (path.length === 0) {
      setPath([next]);
      latestPathRef.current = [next];
      updatePendingSubmit(false);
      setStatus({ tone: "muted", message: "Keep tapping adjacent letters." });
      return;
    }

    const lastCoord = path[path.length - 1];
    const shouldAutoSubmit = options?.autoSubmit === true;

    if (isSameCoord(lastCoord, next)) {
      latestPathRef.current = path;

      if (shouldAutoSubmit) {
        if (pendingSubmitRef.current && path.length >= MIN_PATH_LENGTH) {
          submitPath(path);
          updatePendingSubmit(false);
          return;
        }

        updatePendingSubmit(true);
        return;
      }

      updatePendingSubmit(pendingSubmitRef.current);
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
    updatePendingSubmit(false);
    setStatus({ tone: "muted", message: "Nice—now add or keep extending." });
  }

  function handleUndo() {
    setPath((prev) => prev.slice(0, -1));
    updatePendingSubmit(false);
    setStatus({ tone: "muted", message: "Removed the last letter." });
  }

  function handleAddWord() {
    submitPath(path);
  }

  function handleTypedWordChange(value: string) {
    setTypedWord(value);
    const trimmed = value.trim();

    if (trimmed === "") {
      setPath([]);
      latestPathRef.current = [];
      updatePendingSubmit(false);
      setStatus({ tone: "muted", message: "Tap adjacent letters to build a path." });
      return;
    }

    const matchingPath = findPathForWord(board, trimmed);

    if (matchingPath) {
      setPath(matchingPath);
      latestPathRef.current = matchingPath;
      updatePendingSubmit(false);
      setStatus({ tone: "muted", message: "Press Enter to submit this path." });
      return;
    }

    setPath([]);
    latestPathRef.current = [];
    updatePendingSubmit(false);
    setStatus({
      tone: "error",
      message: "No valid path for that sequence on the board.",
    });
  }

  function handleTypedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = typedWord.trim();

    if (trimmed === "") {
      setStatus({ tone: "error", message: "Type a word to submit." });
      return;
    }

    const matchingPath = findPathForWord(board, trimmed);
    if (!matchingPath) {
      setStatus({
        tone: "error",
        message: "No valid path for that word on this board.",
      });
      setPath([]);
      latestPathRef.current = [];
      updatePendingSubmit(false);
      return;
    }

    setPath(matchingPath);
    latestPathRef.current = matchingPath;
    updatePendingSubmit(false);
    submitPath(matchingPath);
    setTypedWord("");
  }

  useEffect(() => {
    if (words.length === 0) return;

    setPath([]);
    latestPathRef.current = [];
    updatePendingSubmit(false);
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

        <form
          onSubmit={handleTypedSubmit}
          className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-sm font-semibold text-white" htmlFor="typed-word">
              Type a word
            </label>
            <Input
              id="typed-word"
              value={typedWord}
              onChange={(event) => handleTypedWordChange(event.target.value)}
              placeholder="Highlight matching tiles as you type"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-slate-400">
            Letters highlight when a valid path exists. Press Enter to submit the word.
          </p>
        </form>

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
                    handleSelect(rowIndex, colIndex);
                  }}
                  onPointerEnter={() => {
                    if (!isDragging) return;
                    handleSelect(rowIndex, colIndex);
                  }}
                  onPointerUp={() => {
                    setIsDragging(false);
                  }}
                  onClick={() => {
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
          <div className="space-y-6">
            {first5MinWords.length > 0 && (
              <div className="space-y-2">
                {after5MinWords.length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Within 5 minutes
                  </p>
                )}
                <ul className="space-y-2">
                  {first5MinWords.map((entry) => (
                    <li
                      key={entry.word}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white"
                    >
                      <span className="font-semibold uppercase tracking-[0.2em]">{entry.word}</span>
                      <span className="text-sm text-emerald-200">+{entry.score} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {after5MinWords.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  After 5 minutes
                </p>
                <ul className="space-y-2">
                  {after5MinWords.map((entry) => (
                    <li
                      key={entry.word}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white opacity-80"
                    >
                      <span className="font-semibold uppercase tracking-[0.2em]">{entry.word}</span>
                      <span className="text-sm text-emerald-200">+{entry.score} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fallback if logic is weird and we have words but they didn't land in either somehow,
                though strict logic makes that impossible as cutoff is number.
                But if boardStartedAt is null, all go to first5MinWords. */}
          </div>
        )}
      </div>
    </div>
  );
}
