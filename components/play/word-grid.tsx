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

type AddedWord = { word: string; score: number; timestamp?: string };

export function WordGrid({ board, boardDate }: WordGridProps) {
  const [words, setWords] = useState<AddedWord[]>([]);
  const [boardStartedAt, setBoardStartedAt] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [dragPath, setDragPath] = useState<{ row: number; col: number }[] | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial state
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
          .then(({ data: fetchedWords }) => {
            if (fetchedWords) {
              const uniqueWords = new Map<string, AddedWord>();
              fetchedWords.forEach(w => uniqueWords.set(w.word.toLowerCase(), {
                word: w.word,
                score: w.score,
                timestamp: w.created_at
              }));
              setWords(Array.from(uniqueWords.values()));

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
            if (boardData?.board_started) {
              setBoardStartedAt(boardData.board_started);
            }
          });
      }
    });
  }, [boardDate]);

  // Clear feedback after delay
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Categorize words
  const { wordsWithinTime, wordsAfterTime, scoreWithinTime, scoreAfterTime } = useMemo(() => {
    const within: AddedWord[] = [];
    const after: AddedWord[] = [];
    let sWithin = 0;
    let sAfter = 0;

    // 5 minutes in ms
    const TIME_LIMIT = 5 * 60 * 1000;

    words.forEach(w => {
      let isOvertime = false;
      if (boardStartedAt) {
        const start = new Date(boardStartedAt).getTime();
        const wordTime = w.timestamp ? new Date(w.timestamp).getTime() : Date.now();
        if (wordTime - start > TIME_LIMIT) {
          isOvertime = true;
        }
      }

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
  }, [words, boardStartedAt]);


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

  const handleTimeUp = useCallback(() => {
    setIsTimeUp(true);
    if (typeof window !== 'undefined') {
      const key = `wordgrid-time-up-seen-${boardDate}`;
      if (!localStorage.getItem(key)) {
        setShowTimeUpModal(true);
      }
    }
  }, [boardDate]);

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

    // Note: We append URL to text for clipboard, but for shareData it might depend on platform behavior.
    // Usually shareData uses 'url' field.
    // The request asked to include URL in the message.
    // "Include the total number of points, and then the number of each word length as an emoji and then the number of words of that length. ... URL GOES HERE"

    const url = window.location.href;
    const fullText = `${text}${url}`;

    const shareData = {
      title: 'Daily Wordgrid',
      text: fullText,
      // Some platforms ignore 'url' if it's in text, or vice versa.
      // But typically we should put it in the url field for better integration.
      // However, if we put it in text, it's safer for copying.
      // Let's use the requested format in 'text'.
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
    // Allow submission even if time is up

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
            setFeedback({ type, message, row: lastCell.row, col: lastCell.col });
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
      // If not on board, we can't show tooltip on the board because path is null.
      // We rely on toast.
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

    // Optimistic update
    const newWord = { word, score, timestamp: now };
    setWords(prev => [...prev, newWord]);
    setInput("");
    inputRef.current?.focus();
    toast.success(`Found ${word}`, { description: `+${score} points` });
    showFeedback('success', `+${score}`);

    // Persist
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // Start board if needed
      if (!boardStartedAt) {
        setBoardStartedAt(now);
        await supabase
          .from("daily_boards")
          .upsert(
            { user_id: data.user.id, board_date: boardDate, board_started: now },
            { onConflict: "user_id, board_date", ignoreDuplicates: true }
          );
      }

      const { error } = await supabase.from("words").insert({
        user_id: data.user.id,
        board_date: boardDate,
        word,
        score,
      });

      if (error) {
        console.error("Failed to save word:", error);
        toast.error("Failed to save word");
        setWords(prev => prev.filter(w => w.word !== word));
        // Reset last found word if failed? Maybe not needed for UX smooth flow
      }
    }
  }

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
                // Also update input to remove last char
                setInput(prev => prev.slice(0, -1));
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

  return (
    <div className="grid gap-2 sm:gap-6 lg:gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-[300px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]">
          <BoardComponent
            board={board}
            highlightedCells={highlightedCells}
            onInteraction={handleInteraction}
            feedback={feedback}
          />
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
          boardStartedAt={boardStartedAt}
          onTimeUp={handleTimeUp}
          wordsWithinTime={wordsWithinTime}
          wordsAfterTime={wordsAfterTime}
          isTimeUp={isTimeUp}
          onShare={handleShare}
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
