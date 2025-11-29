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

import { BoardComponent } from "./minimal/Board";
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


  // Calculate highlighted cells based on input
  const highlightedCells = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const path = findPathForWord(board, trimmed);
    if (path) {
      return path.map(([row, col]) => ({ row, col }));
    }
    return [];
  }, [input, board]);

  function handleTimeUp() {
    setIsTimeUp(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Allow submission even if time is up

    const trimmed = input.trim();
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-[500px]">
          <BoardComponent
            board={board}
            highlightedCells={highlightedCells}
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
