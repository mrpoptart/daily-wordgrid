"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";

import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, getCurrentUser } from "@/lib/firebase";
import {
  COLLECTIONS,
  dailyBoardDocId,
  timestampToIso,
  wordDocId,
  type DailyBoardDoc,
  type WordDoc,
} from "@/lib/db-schema";
import type { Board } from "@/lib/board/types";
import {
  findPathForWord,
  validateWord,
} from "@/lib/validation/words";
import { scoreWordLength } from "@/lib/scoring";
import { describeDbError } from "@/lib/db-errors";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";
import type { WordLengthCounts } from "@/lib/board/solver";
import {
  SEGMENT_SECONDS,
  DEFAULT_TIME_LIMIT_SECONDS,
  buildSegments,
  formatSegmentTime,
  segmentBreakdownLines,
} from "@/lib/segments";

import { BoardComponent, InteractionType, FeedbackState, FeedbackType } from "./minimal/Board";
import { ActionPanel } from "./minimal/ActionPanel";
import { TimeUpModal } from "./minimal/TimeUpModal";
import { RevealWordsModal } from "./minimal/RevealWordsModal";

export type WordGridProps = {
  board: Board;
  boardDate: string;
  wordLengthCounts: WordLengthCounts;
};

type AddedWord = { word: string; score: number; timestamp?: string; elapsedAt?: number };

// Errors stay on screen long enough to read (and screenshot) on a phone.
function reportDbError(title: string, error: unknown) {
  console.error(`${title}:`, error);
  toast.error(title, { description: describeDbError(error), duration: 15000 });
}

export function WordGrid({ board, boardDate, wordLengthCounts }: WordGridProps) {
  const [words, setWords] = useState<AddedWord[]>([]);
  const [input, setInput] = useState("");
  const [dragPath, setDragPath] = useState<{ row: number; col: number }[] | null>(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackState[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [revealedWords, setRevealedWords] = useState<string[] | null>(null);
  const [showRevealModal, setShowRevealModal] = useState(false);

  // Pause & timer state
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT_SECONDS);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME_LIMIT_SECONDS);

  // Refs for timer logic (avoid stale closures in interval)
  const elapsedBaseRef = useRef(0);       // accumulated elapsed seconds from DB / previous play sessions
  const playResumedAtRef = useRef<number | null>(null); // Date.now() when current play session started
  const timeLimitRef = useRef(DEFAULT_TIME_LIMIT_SECONDS);
  const userIdRef = useRef<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const syncErrorShownRef = useRef(false);
  const feedbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Detect touch devices to avoid focusing the input (which opens virtual keyboard)
  const isTouchDevice = useRef(false);
  useEffect(() => {
    isTouchDevice.current = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice.current) {
      inputRef.current?.focus();
    }
  }, []);

  const focusInput = useCallback(() => {
    if (!isTouchDevice.current) {
      inputRef.current?.focus();
    }
  }, []);

  // Helper: get current total elapsed seconds (base + current session delta)
  const getCurrentElapsed = useCallback(() => {
    if (playResumedAtRef.current !== null) {
      const deltaS = (Date.now() - playResumedAtRef.current) / 1000;
      return Math.min(timeLimitRef.current, elapsedBaseRef.current + deltaS);
    }
    return elapsedBaseRef.current;
  }, []);

  // Helper: sync elapsed seconds to database
  const syncElapsedToDb = useCallback(async (seconds: number) => {
    if (!userIdRef.current) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.dailyBoards, dailyBoardDocId(userIdRef.current, boardDate)), {
        elapsed_seconds: seconds,
      });
    } catch (error) {
      // Syncs run often; show the first failure only
      if (!syncErrorShownRef.current) {
        syncErrorShownRef.current = true;
        reportDbError("Failed to save timer", error);
      } else {
        console.error("Failed to sync elapsed time:", error);
      }
    }
  }, [boardDate]);

  // Load initial state
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        userIdRef.current = user.uid;
        setUserEmail(user.email ?? null);

        // Fetch words (include elapsed_at for categorization)
        getDocs(
          query(
            collection(db, COLLECTIONS.words),
            where("user_id", "==", user.uid),
            where("board_date", "==", boardDate)
          )
        )
          .then((snapshot) => {
            const fetchedWords = snapshot.docs
              .map((d) => d.data() as WordDoc)
              .map((w) => ({ ...w, created_at: timestampToIso(w.created_at) ?? "" }))
              .sort((a, b) => a.created_at.localeCompare(b.created_at));
            const uniqueWords = new Map<string, AddedWord>();
            fetchedWords.forEach(w => uniqueWords.set(w.word.toLowerCase(), {
              word: w.word,
              score: w.score,
              timestamp: w.created_at,
              elapsedAt: w.elapsed_at ?? undefined
            }));
            setWords(Array.from(uniqueWords.values()));
          })
          .catch((error) => reportDbError("Failed to load your words", error));

        // Fetch streak (direct query, no API round-trip)
        getDocs(query(collection(db, COLLECTIONS.dailyBoards), where("user_id", "==", user.uid)))
          .then((snapshot) => {
            const completedDays = snapshot.docs
              .map((d) => d.data() as DailyBoardDoc)
              .filter((d) => d.elapsed_seconds >= DEFAULT_TIME_LIMIT_SECONDS);
            if (!completedDays.length) return;
            const completedSet = new Set(completedDays.map((d) => d.board_date));
            let count = 0;
            const cur = new Date(boardDate + "T12:00:00Z");
            // Start from today or yesterday
            if (completedSet.has(boardDate)) {
              count = 1;
            } else {
              cur.setDate(cur.getDate() - 1);
              const yesterday = cur.toISOString().slice(0, 10);
              if (completedSet.has(yesterday)) {
                count = 1;
              } else {
                return;
              }
            }
            // Count backwards
            while (true) {
              cur.setDate(cur.getDate() - 1);
              const dateStr = cur.toISOString().slice(0, 10);
              if (completedSet.has(dateStr)) {
                count++;
              } else {
                break;
              }
            }
            setStreak(count);
          })
          .catch((error) => console.error("Failed to load streak:", error));

        // Fetch board state (elapsed_seconds + time_limit_seconds)
        getDoc(doc(db, COLLECTIONS.dailyBoards, dailyBoardDocId(user.uid, boardDate)))
          .then((snapshot) => {
            const boardData = snapshot.exists() ? (snapshot.data() as DailyBoardDoc) : null;
            if (boardData?.board_started) {
              const elapsed = boardData.elapsed_seconds ?? 0;
              const limit = boardData.time_limit_seconds ?? DEFAULT_TIME_LIMIT_SECONDS;
              elapsedBaseRef.current = elapsed;
              timeLimitRef.current = limit;
              setTimeLimit(limit);
              setGameStarted(true);

              if (elapsed >= limit) {
                setTimeRemaining(0);
                setIsPaused(true);
              } else {
                // Always load as paused — user clicks Resume to continue
                setTimeRemaining(limit - elapsed);
                setIsPaused(true);
              }
            }
          })
          .catch((error) => reportDbError("Failed to load your game", error));
      }
    });
  }, [boardDate]);

  // Check if words were already revealed for this board date
  useEffect(() => {
    const key = `wordgrid-revealed-${boardDate}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setRevealedWords(JSON.parse(cached));
      } catch {
        // ignore invalid cache
      }
    }
  }, [boardDate]);

  // Handler to show reveal confirmation modal
  const handleRevealWords = useCallback(() => {
    setShowRevealModal(true);
  }, []);

  // Confirm reveal: fetch and display all words
  const handleConfirmReveal = useCallback(async () => {
    setShowRevealModal(false);
    try {
      const res = await fetch(`/api/board/words?date=${boardDate}`);
      if (!res.ok) {
        toast.error("Failed to load words");
        return;
      }
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.words)) {
        setRevealedWords(data.words);
        localStorage.setItem(
          `wordgrid-revealed-${boardDate}`,
          JSON.stringify(data.words)
        );
      } else {
        toast.error("Failed to load words");
      }
    } catch (err) {
      console.error("Failed to fetch board words:", err);
      toast.error("Failed to load words");
    }
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

    // Immediate display update
    setTimeRemaining(
      Math.max(0, timeLimitRef.current - Math.floor(elapsedBaseRef.current))
    );

    const interval = setInterval(() => {
      const limit = timeLimitRef.current;
      const deltaS = (Date.now() - playResumedAtRef.current!) / 1000;
      const currentElapsed = elapsedBaseRef.current + deltaS;
      const remaining = Math.max(0, limit - Math.floor(currentElapsed));

      setTimeRemaining(remaining);
      syncElapsedToDb(Math.floor(Math.min(limit, currentElapsed)));

      if (remaining <= 0) {
        elapsedBaseRef.current = limit;
        playResumedAtRef.current = null;
        syncElapsedToDb(limit);
        setIsPaused(true);
        setShowTimeUpModal(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, isPaused, syncElapsedToDb]);

  // Sync elapsed time when page is being hidden (tab switch, close, refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && playResumedAtRef.current !== null) {
        const deltaS = (Date.now() - playResumedAtRef.current) / 1000;
        const currentElapsed = Math.min(timeLimitRef.current, elapsedBaseRef.current + deltaS);
        syncElapsedToDb(Math.floor(currentElapsed));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncElapsedToDb]);

  // Bucket words into 5-minute segments based on elapsed_at.
  const segments = useMemo(
    () => buildSegments(words, timeLimit),
    [words, timeLimit]
  );

  const { totalScore, foundLengthCounts } = useMemo(() => {
    const foundCounts: WordLengthCounts = { "4": 0, "5": 0, "6": 0, "7": 0, "8+": 0 };
    let total = 0;
    words.forEach(w => {
      total += w.score;
      const len = w.word.length;
      if (len >= 8) foundCounts["8+"]++;
      else if (len >= 4) foundCounts[String(len)]++;
    });
    return { totalScore: total, foundLengthCounts: foundCounts };
  }, [words]);

  // Segments with alphabetically-sorted word lists for display.
  const displaySegments = useMemo(
    () =>
      segments.map(s => ({
        ...s,
        words: [...s.words].sort((a, b) => a.word.localeCompare(b.word)),
      })),
    [segments]
  );

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
    if (userIdRef.current) {
      // Insert-if-absent (the former upsert with ignoreDuplicates)
      const ref = doc(db, COLLECTIONS.dailyBoards, dailyBoardDocId(userIdRef.current, boardDate));
      try {
        const existing = await getDoc(ref);
        if (!existing.exists()) {
          await setDoc(ref, {
            user_id: userIdRef.current,
            board_date: boardDate,
            board_started: serverTimestamp(),
            elapsed_seconds: 0,
            time_limit_seconds: DEFAULT_TIME_LIMIT_SECONDS,
          });
        }
      } catch (error) {
        reportDbError("Failed to start game", error);
      }
    }
    elapsedBaseRef.current = 0;
    timeLimitRef.current = DEFAULT_TIME_LIMIT_SECONDS;
    setTimeLimit(DEFAULT_TIME_LIMIT_SECONDS);
    setTimeRemaining(DEFAULT_TIME_LIMIT_SECONDS);
    setGameStarted(true);
    setIsPaused(false);
  }, [boardDate]);

  // Toggle pause/resume
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      focusInput();
    } else {
      // Pause: snapshot elapsed time and sync to DB
      if (playResumedAtRef.current !== null) {
        const deltaS = (Date.now() - playResumedAtRef.current) / 1000;
        elapsedBaseRef.current = Math.min(
          timeLimitRef.current,
          elapsedBaseRef.current + deltaS
        );
        syncElapsedToDb(Math.floor(elapsedBaseRef.current));
        playResumedAtRef.current = null;
      }
      setIsPaused(true);
    }
  }, [isPaused, syncElapsedToDb]);

  // Extend the session by one more 5-minute segment.
  const handleExtendTime = useCallback(async () => {
    const newLimit = timeLimitRef.current + SEGMENT_SECONDS;
    timeLimitRef.current = newLimit;
    setTimeLimit(newLimit);
    setTimeRemaining(Math.max(0, newLimit - Math.floor(elapsedBaseRef.current)));
    setShowTimeUpModal(false);

    if (userIdRef.current) {
      try {
        await updateDoc(doc(db, COLLECTIONS.dailyBoards, dailyBoardDocId(userIdRef.current, boardDate)), {
          time_limit_seconds: newLimit,
        });
      } catch (error) {
        reportDbError("Failed to save time extension", error);
      }
    }

    setIsPaused(false);
    focusInput();
  }, [boardDate, focusInput]);

  async function handleShare() {
    // Length breakdown across all found words
    const lengthCounts = new Map<number, number>();
    words.forEach(w => {
      const len = w.word.length;
      lengthCounts.set(len, (lengthCounts.get(len) || 0) + 1);
    });
    const sortedLengths = Array.from(lengthCounts.keys()).sort((a, b) => a - b);

    let lengthBreakdown = "";
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
        else emoji = `${len}`;

        if (emoji) {
            lengthBreakdown += `${emoji}: ${count} ${count === 1 ? 'word' : 'words'}\n`;
        }
    });

    const timePlayed = formatSegmentTime(timeLimit);
    const segmentLines = segmentBreakdownLines(segments);
    const segmentText = segmentLines
      .map(l => `• ${l.label} — ${l.score} pts (${l.wordCount} ${l.wordCount === 1 ? "word" : "words"})`)
      .join("\n");

    const header = `Daily Word Grid — ${totalScore} pts in ${timePlayed}`;
    const body = segmentLines.length > 1
      ? `${header}\n${segmentText}\n${lengthBreakdown}`
      : `${header}\n${lengthBreakdown}`;

    const url = window.location.href;
    const fullText = `${body}${url}`;

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

  async function handleSubmit(e?: React.FormEvent, explicitWord?: string, explicitPath?: {row: number, col: number}[]) {
    if (e) e.preventDefault();
    if (!gameStarted || isPaused || revealedWords) return;

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
      focusInput();
      return;
    }

    // Check duplicates
    if (words.some(w => w.word.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already found");
      showFeedback('duplicate');
      setInput("");
      focusInput();
      return;
    }

    // Validate path
    const path = findPathForWord(board, trimmed);
    if (!path) {
      toast.error("Not on board");
      setInput("");
      focusInput();
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
       focusInput();
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
    focusInput();
    toast.success(`Found ${word}`, { description: `+${score} points` });
    showFeedback('success', `+${score}`);

    // Persist
    if (userIdRef.current) {
      try {
        // Deterministic ID: one doc per user + date + word (duplicates are blocked above)
        await setDoc(doc(db, COLLECTIONS.words, wordDocId(userIdRef.current, boardDate, word)), {
          id: crypto.randomUUID(),
          user_id: userIdRef.current,
          board_date: boardDate,
          word,
          score,
          created_at: serverTimestamp(),
          elapsed_at: Math.floor(currentElapsed),
        });
      } catch (error) {
        reportDbError("Failed to save word", error);
        setWords(prev => prev.filter(w => w.word !== word));
      }

      // Piggyback: sync elapsed time on word submit
      syncElapsedToDb(Math.floor(currentElapsed));
    }
  }

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const handleInteraction = (row: number, col: number, type: InteractionType) => {
    if (revealedWords) return;
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
            {streak > 0 && (
              <span className="text-sm font-medium text-amber-400">
                Continue your {streak} day streak
              </span>
            )}
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
            {streak > 0 && (
              <span className="text-sm font-medium text-amber-400">
                Continue your {streak} day streak
              </span>
            )}
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

  // Progress bar fills the current 5-minute segment so each extension feels fresh.
  const elapsedSeconds = timeLimit - timeRemaining;
  const segmentProgressFraction = timeRemaining <= 0
    ? 0
    : Math.max(0, Math.min(1, (SEGMENT_SECONDS - (elapsedSeconds % SEGMENT_SECONDS)) / SEGMENT_SECONDS));
  const currentSegmentIndex = Math.min(
    segments.length - 1,
    Math.floor(elapsedSeconds / SEGMENT_SECONDS)
  );

  return (
    <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]">
          {renderBoardArea()}
          {/* Time remaining bar — per segment */}
          {gameStarted && (
            <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${segmentProgressFraction * 100}%`,
                  transformOrigin: 'right',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Panel Column */}
      <div className="w-full">
        <ActionPanel
          inputRef={inputRef}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          totalScore={totalScore}
          timeRemaining={timeRemaining}
          timeLimit={timeLimit}
          segments={displaySegments}
          currentSegmentIndex={currentSegmentIndex}
          gameStarted={gameStarted}
          wordLengthCounts={wordLengthCounts}
          foundLengthCounts={foundLengthCounts}
          onShare={handleShare}
          userEmail={userEmail}
          onLogout={handleLogout}
          isPaused={isPaused}
          onPause={handlePauseToggle}
          revealedWords={revealedWords}
          onRevealWords={handleRevealWords}
        />
      </div>

      <TimeUpModal
        totalScore={totalScore}
        wordsFound={words.length}
        timeLimit={timeLimit}
        segments={segments}
        onShare={handleShare}
        onExtend={handleExtendTime}
        onDismiss={() => setShowTimeUpModal(false)}
        isOpen={showTimeUpModal}
      />

      <RevealWordsModal
        isOpen={showRevealModal}
        onConfirm={handleConfirmReveal}
        onCancel={() => setShowRevealModal(false)}
      />
    </div>
  );
}
