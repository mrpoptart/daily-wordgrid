"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import type { Board } from "@/lib/board/types";
import {
  findPathForWord,
  validateWord,
} from "@/lib/validation/words";
import { scoreWordLength } from "@/lib/scoring";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";

import { BoardComponent, InteractionType, FeedbackState, FeedbackType } from "./minimal/Board";
import { ActionPanel } from "./minimal/ActionPanel";
import { TimeUpModal } from "./minimal/TimeUpModal";

export type WordGridProps = {
  board: Board;
  boardDate: string;
};

type AddedWord = { word: string; score: number; timestamp?: string; elapsedAt?: number };

const TIME_LIMIT_SECONDS = 300; // 5 minutes

export function WordGrid({ board, boardDate }: WordGridProps) {
  const [words, setWords] = useState<AddedWord[]>([]);
  const [input, setInput] = useState("");
  const [dragPath, setDragPath] = useState<{ row: number; col: number }[] | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackState[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Pause & timer state
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIME_LIMIT_SECONDS);

  // Refs for timer logic (avoid stale closures in interval)
  const elapsedBaseRef = useRef(0);       // accumulated elapsed seconds from DB / previous play sessions
  const playResumedAtRef = useRef<number | null>(null); // Date.now() when current play session started
  const syncCounterRef = useRef(0);
  const userIdRef = useRef<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Helper: get current total elapsed seconds (base + current session delta)
  const getCurrentElapsed = useCallback(() => {
    if (playResumedAtRef.current !== null) {
      const deltaS = (Date.now() - playResumedAtRef.current) / 1000;
      return Math.min(TIME_LIMIT_SECONDS, elapsedBaseRef.current + deltaS);
    }
    return elapsedBaseRef.current;
  }, []);

  // Helper: sync elapsed seconds to database
  const syncElapsedToDb = useCallback(async (seconds: number) => {
    if (!userIdRef.current) return;
    await supabase
      .from("daily_boards")
      .update({ elapsed_seconds: seconds })
      .eq("user_id", userIdRef.current)
      .eq("board_date", boardDate);
  }, [boardDate]);

  // Load initial state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        userIdRef.current = data.user.id;
        setUserEmail(data.user.email ?? null);

        // Fetch words (include elapsed_at for categorization)
        supabase
          .from("words")
          .select("word, score, created_at, elapsed_at")
          .eq("user_id", data.user.id)
          .eq("board_date", boardDate)
          .order("created_at", { ascending: true })
          .then(({ data: fetchedWords }) => {
            if (fetchedWords) {
              const uniqueWords = new Map<string, AddedWord>();
              fetchedWords.forEach(w => uniqueWords.set(w.word.toLowerCase(), {
                word: w.word,
                score: w.score,
                timestamp: w.created_at,
                elapsedAt: w.elapsed_at ?? undefined
              }));
              setWords(Array.from(uniqueWords.values()));
            }
          });

        // Fetch board state (elapsed_seconds)
        supabase
          .from("daily_boards")
          .select("board_started, elapsed_seconds")
          .eq("user_id", data.user.id)
          .eq("board_date", boardDate)
          .single()
          .then(({ data: boardData }) => {
            if (boardData?.board_started) {
              const elapsed = boardData.elapsed_seconds ?? 0;
              elapsedBaseRef.current = elapsed;
              setGameStarted(true);

              if (elapsed >= TIME_LIMIT_SECONDS) {
                setTimeRemaining(0);
                setIsTimeUp(true);
                setIsPaused(false);
              } else {
                // Always load as paused — user clicks Resume to continue
                setTimeRemaining(TIME_LIMIT_SECONDS - elapsed);
                setIsPaused(true);
              }
            }
          });
      }
    });
  }, [boardDate]);

  // Cleanup function for feedback timeouts on unmount
  useEffect(() => {
    return () => {
      feedbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
      feedbackTimeouts.current.clear();
    };
  }, []);

  // Timer interval — runs only when game is started and not paused
  useEffect(() => {
    if (!gameStarted || isPaused) {
      playResumedAtRef.current = null;
      return;
    }

    playResumedAtRef.current = Date.now();
    syncCounterRef.current = 0;

    // Immediate display update
    setTimeRemaining(Math.max(0, TIME_LIMIT_SECONDS - Math.floor(elapsedBaseRef.current)));

    const interval = setInterval(() => {
      const deltaS = (Date.now() - playResumedAtRef.current!) / 1000;
      const currentElapsed = elapsedBaseRef.current + deltaS;
      const remaining = Math.max(0, TIME_LIMIT_SECONDS - Math.floor(currentElapsed));

      setTimeRemaining(remaining);

      // Sync to DB every 5 ticks
      syncCounterRef.current++;
      if (syncCounterRef.current % 5 === 0) {
        syncElapsedToDb(Math.floor(currentElapsed));
      }

      if (remaining <= 0) {
        elapsedBaseRef.current = TIME_LIMIT_SECONDS;
        syncElapsedToDb(TIME_LIMIT_SECONDS);
        setIsTimeUp(true);

        if (typeof window !== 'undefined') {
          const key = `wordgrid-time-up-seen-${boardDate}`;
          if (!localStorage.getItem(key)) {
            setShowTimeUpModal(true);
          }
        }
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  // elapsedBaseRef intentionally excluded — we read the ref, not the state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, isPaused, boardDate, syncElapsedToDb]);

  // Categorize words using elapsed_at (play-time based, not wall-clock)
  const { wordsWithinTime, wordsAfterTime, scoreWithinTime, scoreAfterTime } = useMemo(() => {
    const within: AddedWord[] = [];
    const after: AddedWord[] = [];
    let sWithin = 0;
    let sAfter = 0;

    words.forEach(w => {
      const isOvertime = w.elapsedAt != null && w.elapsedAt >= TIME_LIMIT_SECONDS;

      if (isOvertime) {
        after.push(w);
        sAfter += w.score;
      } else {
        within.push(w);
        sWithin += w.score;
      }
    });

    return {
      wordsWithinTime: within.sort((a, b) => a.word.localeCompare(b.word)),
      wordsAfterTime: after.sort((a, b) => a.word.localeCompare(b.word)),
      scoreWithinTime: sWithin,
      scoreAfterTime: sAfter
    };
  }, [words]);

  // Calculate highlighted cells based on input or drag
  const highlightedCells = useMemo(() => {
    if (dragPath) return dragPath;

    const trimmed = input.trim();
    if (!trimmed) return [];

    const path = findPathForWord(board, trimmed);
    if (path) {
      return path.map(([row, col]) => ({ row, col }));
    }
    return [];
  }, [input, board, dragPath]);

  // Start the game for the first time
  const handleStart = useCallback(async () => {
    const now = new Date().toISOString();
    if (userIdRef.current) {
      await supabase.from("daily_boards").upsert(
        { user_id: userIdRef.current, board_date: boardDate, board_started: now, elapsed_seconds: 0 },
        { onConflict: "user_id, board_date", ignoreDuplicates: true }
      );
    }
    elapsedBaseRef.current = 0;
    setTimeRemaining(TIME_LIMIT_SECONDS);
    setGameStarted(true);
    setIsPaused(false);
  }, [boardDate]);

  // Toggle pause/resume
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      inputRef.current?.focus();
    } else {
      // Pause: snapshot elapsed time and sync to DB
      if (playResumedAtRef.current !== null) {
        const deltaS = (Date.now() - playResumedAtRef.current) / 1000;
        elapsedBaseRef.current = Math.min(TIME_LIMIT_SECONDS, elapsedBaseRef.current + deltaS);
        syncElapsedToDb(Math.floor(elapsedBaseRef.current));
        playResumedAtRef.current = null;
      }
      setIsPaused(true);
    }
  }, [isPaused, syncElapsedToDb]);

  async function handleShare() {
    // Generate breakdown by length
    const lengthCounts = new Map<number, number>();
    wordsWithinTime.forEach(w => {
      const len = w.word.length;
      lengthCounts.set(len, (lengthCounts.get(len) || 0) + 1);
    });

    // Sort lengths
    const sortedLengths = Array.from(lengthCounts.keys()).sort((a, b) => a - b);

    let breakdown = "";
    sortedLengths.forEach(len => {
        const count = lengthCounts.get(len);
        let emoji = "";
        if (len === 4) emoji = "4️⃣";
        else if (len === 5) emoji = "5️⃣";
        else if (len === 6) emoji = "6️⃣";
        else if (len === 7) emoji = "7️⃣";
        else if (len === 8) emoji = "8️⃣";
        else if (len === 9) emoji = "9️⃣";
        else if (len === 10) emoji = "🔟";
        else emoji = `${len}`; // Fallback

        if (emoji) {
            breakdown += `${emoji}: ${count} ${count === 1 ? 'word' : 'words'}\n`;
        }
    });

    const text = `I got ${scoreWithinTime} points on Daily Word Grid today!
${breakdown}`;

    const url = window.location.href;
    const fullText = `${text}${url}`;

    const shareData = {
      title: 'Daily Wordgrid',
      text: fullText,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }

    // Fallback to clipboard
    navigator.clipboard.writeText(fullText);
    toast.success("Score copied to clipboard!");
  }

  function handleKeepPlaying() {
    setShowTimeUpModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`wordgrid-time-up-seen-${boardDate}`, 'true');
    }
    inputRef.current?.focus();
  }

  async function handleSubmit(e?: React.FormEvent, explicitWord?: string, explicitPath?: {row: number, col: number}[]) {
    if (e) e.preventDefault();
    if (!gameStarted || isPaused) return;

    const trimmed = (explicitWord || input).trim();
    if (!trimmed) return;

    // Determine path for feedback
    let pathForFeedback: {row: number, col: number}[] | null = null;
    if (explicitPath) {
        pathForFeedback = explicitPath;
    } else {
        // Fallback to finding path
        const p = findPathForWord(board, trimmed);
        if (p) {
             pathForFeedback = p.map(([row, col]) => ({ row, col }));
        }
    }

    const lastCell = pathForFeedback ? pathForFeedback[pathForFeedback.length - 1] : null;
    const showFeedback = (type: FeedbackType, message?: string) => {
        if (lastCell) {
            const id = `${Date.now()}-${Math.random()}`;
            const newFeedback: FeedbackState = {
              id,
              type,
              message,
              row: lastCell.row,
              col: lastCell.col
            };

            setFeedbacks(prev => [...prev, newFeedback]);

            // Set timeout to remove this specific feedback after 1500ms
            const timeout = setTimeout(() => {
                setFeedbacks(prev => prev.filter(f => f.id !== id));
                feedbackTimeouts.current.delete(id);
            }, 1500);

            feedbackTimeouts.current.set(id, timeout);
        }
    };

    if (trimmed.length < MIN_PATH_LENGTH) {
      toast.error("Too short", { description: `Minimum ${MIN_PATH_LENGTH} letters` });
      showFeedback('invalid');
      setInput("");
      inputRef.current?.focus();
      return;
    }

    // Check duplicates
    if (words.some(w => w.word.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already found");
      showFeedback('duplicate');
      setInput("");
      inputRef.current?.focus();
      return;
    }

    // Validate path
    const path = findPathForWord(board, trimmed);
    if (!path) {
      toast.error("Not on board");
      setInput("");
      inputRef.current?.focus();
      return;
    }

    // Validate word existence
    const validation = validateWord(board, path);
    if (!validation.ok) {
       if (validation.reason === 'not-in-dictionary') {
         toast.error("Not in dictionary");
       } else {
         toast.error("Invalid word");
       }
       showFeedback('invalid');
       setInput("");
       inputRef.current?.focus();
       return;
    }

    const word = validation.word || trimmed;
    const score = scoreWordLength(word.length);
    const now = new Date().toISOString();
    const currentElapsed = getCurrentElapsed();

    // Optimistic update
    const newWord = { word, score, timestamp: now, elapsedAt: Math.floor(currentElapsed) };
    setWords(prev => [...prev, newWord]);
    setInput("");
    inputRef.current?.focus();
    toast.success(`Found ${word}`, { description: `+${score} points` });
    showFeedback('success', `+${score}`);

    // Persist
    if (userIdRef.current) {
      const { error } = await supabase.from("words").insert({
        user_id: userIdRef.current,
        board_date: boardDate,
        word,
        score,
        elapsed_at: Math.floor(currentElapsed),
      });

      if (error) {
        console.error("Failed to save word:", error);
        toast.error("Failed to save word");
        setWords(prev => prev.filter(w => w.word !== word));
      }

      // Piggyback: sync elapsed time on word submit
      syncElapsedToDb(Math.floor(currentElapsed));
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleInteraction = (row: number, col: number, type: InteractionType) => {
    if (type === 'start') {
        const letter = board[row][col];
        setDragPath([{ row, col }]);
        setInput(letter);
    } else if (type === 'move') {
        if (!dragPath) return;

        const lastCell = dragPath[dragPath.length - 1];

        // Ignore same cell
        if (lastCell.row === row && lastCell.col === col) return;

        // Check for backtrack
        if (dragPath.length > 1) {
            const prevCell = dragPath[dragPath.length - 2];
            if (prevCell.row === row && prevCell.col === col) {
                const newPath = dragPath.slice(0, -1);
                setDragPath(newPath);
                // Also update input to remove last letter (handles QU as 2 chars)
                setInput(prev => {
                    const lastLetter = board[lastCell.row][lastCell.col];
                    return prev.slice(0, -lastLetter.length);
                });
                return;
            }
        }

        // Check adjacency
        const rowDiff = Math.abs(lastCell.row - row);
        const colDiff = Math.abs(lastCell.col - col);
        const isAdjacent = rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);

        if (!isAdjacent) return;

        // Check if visited
        const isVisited = dragPath.some(c => c.row === row && c.col === col);
        if (isVisited) return;

        const letter = board[row][col];
        setDragPath([...dragPath, { row, col }]);
        setInput(prev => prev + letter);

    } else if (type === 'end') {
        if (dragPath && dragPath.length > 0) {
             const word = dragPath.map(p => board[p.row][p.col]).join("");
             // Pass the dragPath as the explicit path for feedback location
             handleSubmit(undefined, word, dragPath);
        }
        setDragPath(null);
    }
  };

  // Board area: not started → Start button, paused → Resume button, playing → Board
  const renderBoardArea = () => {
    if (!gameStarted) {
      return (
        <div className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-slate-900/80">
          <button
            onClick={handleStart}
            className="flex flex-col items-center gap-3 text-slate-300 hover:text-emerald-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            <span className="text-lg font-semibold">Start</span>
          </button>
        </div>
      );
    }

    if (isPaused) {
      return (
        <div className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-slate-900/80">
          <button
            onClick={handlePauseToggle}
            className="flex flex-col items-center gap-3 text-slate-300 hover:text-emerald-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            <span className="text-lg font-semibold">Resume</span>
          </button>
        </div>
      );
    }

    return (
      <BoardComponent
        board={board}
        highlightedCells={highlightedCells}
        onInteraction={handleInteraction}
        feedbacks={feedbacks}
      />
    );
  };

  return (
    <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]">
          {renderBoardArea()}
        </div>
      </div>

      {/* Action Panel Column */}
      <div className="w-full">
        <ActionPanel
          inputRef={inputRef}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          scoreWithinTime={scoreWithinTime}
          scoreAfterTime={scoreAfterTime}
          timeRemaining={timeRemaining}
          gameStarted={gameStarted}
          wordsWithinTime={wordsWithinTime}
          wordsAfterTime={wordsAfterTime}
          onShare={handleShare}
          userEmail={userEmail}
          onLogout={handleLogout}
          isPaused={isPaused}
          onPause={handlePauseToggle}
        />
      </div>

      <TimeUpModal
        score={scoreWithinTime}
        wordsFound={wordsWithinTime.length}
        onShare={handleShare}
        onKeepPlaying={handleKeepPlaying}
        isOpen={showTimeUpModal}
      />
    </div>
  );
}
