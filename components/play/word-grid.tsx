"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
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
  date: string;
};

type Status =
  | { tone: "muted"; message: string }
  | { tone: "error"; message: string }
  | { tone: "success"; message: string };

type AddedWord = { word: string; score: number };

function isSameCoord(a: Coord, b: Coord): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function WordGrid({ board, date }: WordGridProps) {
  const [path, setPath] = useState<Coord[]>([]);
  const [words, setWords] = useState<AddedWord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const pendingSubmitRef = useRef(false);
  const [typedWord, setTypedWord] = useState("");
  const [status, setStatus] = useState<Status>({
    tone: "muted",
    message: "Tap adjacent letters to build a path.",
  });

  function decodeSupabaseUserId(): string | null {
    if (typeof document === "undefined") return null;

    const authCookie = document.cookie
      .split(";")
      .map((pair) => pair.trim())
      .find((entry) => entry.startsWith("sb-") && entry.endsWith("-auth-token"));

    if (!authCookie) return null;

    const [, value] = authCookie.split("=");
    if (!value) return null;

    try {
      const decoded = JSON.parse(decodeURIComponent(value));
      const accessToken = decoded?.currentSession?.access_token;
      if (typeof accessToken !== "string") return null;

      const [, payload] = accessToken.split(".");
      if (!payload) return null;

      const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      const sub = json?.sub;
      return typeof sub === "string" && sub.trim().length > 0 ? sub : null;
    } catch {
      return null;
    }
  }

  function resolveUserId(): string | null {
    if (typeof window === "undefined") return null;

    const supabaseId = decodeSupabaseUserId();
    if (supabaseId) return supabaseId;

    const localKey = "wordgrid-local-user-id";
    const existingLocalId = window.localStorage.getItem(localKey);
    if (existingLocalId && existingLocalId.trim()) return existingLocalId;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(localKey, generated);
    return generated;
  }

  async function persistWords(nextWords: AddedWord[]) {
    if (!userId) return;

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          date,
          words: nextWords.map((entry) => entry.word),
          score: nextWords.reduce((sum, entry) => sum + entry.score, 0),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to persist words: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      setStatus({
        tone: "error",
        message: "Couldn't save progress. We'll retry on your next add.",
      });
    }
  }

  function updatePendingSubmit(next: boolean) {
    pendingSubmitRef.current = next;
  }

  const latestPathRef = useRef<Coord[]>([]);

  const currentWord = useMemo(() => assembleWord(board, path), [board, path]);

  const totalScore = useMemo(
    () => words.reduce((sum, entry) => sum + entry.score, 0),
    [words],
  );

  function resetPath(nextStatus?: Status) {
    setPath([]);
    latestPathRef.current = [];
    updatePendingSubmit(false);
    if (nextStatus) setStatus(nextStatus);
  }

  function submitPath(targetPath: Coord[]) {
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
    setWords((prev) => {
      const next = [...prev, { word, score }];
      void persistWords(next);
      return next;
    });
    resetPath({ tone: "success", message: `Added ${word} (+${score} pts).` });
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
    const resolvedUserId = resolveUserId();

    if (!resolvedUserId) {
      setStatus({
        tone: "error",
        message: "We couldn't find your session. Try logging in again.",
      });
      setIsHydrating(false);
      return;
    }

    setUserId(resolvedUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function loadExistingSubmission() {
      try {
        const response = await fetch(`/api/submit?userId=${encodeURIComponent(userId)}&date=${date}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch existing submission: ${response.status}`);
        }

        const json = (await response.json()) as { status: string; submission: { words: string[] } | null };
        if (json.submission && Array.isArray(json.submission.words)) {
          const hydrated = json.submission.words.map((word) => ({
            word,
            score: scoreWordLength(word.length),
          }));
          if (isMounted) {
            setWords(hydrated);
            setStatus({ tone: "muted", message: "Restored your saved words for today." });
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStatus({ tone: "error", message: "Couldn't load saved words. Try refreshing." });
        }
      } finally {
        if (isMounted) setIsHydrating(false);
      }
    }

    loadExistingSubmission();

    return () => {
      isMounted = false;
    };
  }, [date, userId]);

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

        {isHydrating ? (
          <p className="text-sm text-slate-300">Loading your saved words…</p>
        ) : words.length === 0 ? (
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
