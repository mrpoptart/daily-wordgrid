"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import type { Board } from "@/lib/board/types";
import {
  findPathForWord,
  validateWord,
} from "@/lib/validation/words";
import { scoreWordLength } from "@/lib/scoring";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";

import { BoardComponent, InteractionType } from "./minimal/Board";
import { ActionPanel } from "./minimal/ActionPanel";

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
      wordsWithinTime: within,
      wordsAfterTime: after,
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

  function handleTimeUp() {
    setIsTimeUp(true);
  }

  async function handleSubmit(e?: React.FormEvent, explicitWord?: string) {
    if (e) e.preventDefault();
    // Allow submission even if time is up

    const trimmed = (explicitWord || input).trim();
    if (!trimmed) return;

    if (trimmed.length < MIN_PATH_LENGTH) {
      toast.error("Too short", { description: `Minimum ${MIN_PATH_LENGTH} letters` });
      setInput("");
      inputRef.current?.focus();
      return;
    }

    // Check duplicates
    if (words.some(w => w.word.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already found");
      setInput("");
      inputRef.current?.focus();
      return;
    }

    // Validate path
    // Even if dragged, we double check validity (e.g. against dictionary)
    // We re-find path to ensure consistent validation logic,
    // but strictly speaking we could assume path is valid if explicitWord comes from drag.
    // However, validation also checks dictionary.

    // Check if on board (always true for drag, but good sanity check)
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
             // Slight delay or immediate? Immediate is snappier.
             handleSubmit(undefined, word);
        }
        setDragPath(null);
    }
  };

  return (
    <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-[300px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]">
          <BoardComponent
            board={board}
            highlightedCells={highlightedCells}
            onInteraction={handleInteraction}
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
        />
      </div>
    </div>
  );
}
