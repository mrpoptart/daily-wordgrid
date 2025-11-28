"use client";

import { useEffect, useState, useMemo } from "react";
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
          .then(({ data: fetchedWords }) => { // Removed unused error
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

  const totalScore = useMemo(
    () => words.reduce((sum, entry) => sum + entry.score, 0),
    [words],
  );

  // Calculate highlighted cells based on input
  const highlightedCells = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Check if the current input forms a valid path (prefix or full word)
    // findPathForWord returns a full path if the word exists.
    // Ideally we'd want to highlight as they type even if it's partial,
    // but findPathForWord checks for the full string.
    // If the user types 'A', we want to highlight 'A'.
    // If 'AB', highlight 'A' and 'B'.
    // Since we don't have a partial path finder exposed easily without rewriting DFS,
    // we will rely on findPathForWord which returns a path if the sequence exists on board.

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
    if (isTimeUp) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed.length < MIN_PATH_LENGTH) {
      toast.error("Too short", { description: `Minimum ${MIN_PATH_LENGTH} letters` });
      return;
    }

    // Check duplicates
    if (words.some(w => w.word.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already found");
      setInput("");
      return;
    }

    // Validate path
    const path = findPathForWord(board, trimmed);
    if (!path) {
      toast.error("Not on board");
      return;
    }

    // Validate word existence
    const validation = validateWord(board, path);
    if (!validation.ok) {
       // validateWord re-checks path and length, but also checks dictionary if implemented
       // The original code had dictionary check inside validateWord?
       // Let's check the original code... validation.reason === 'not-in-dictionary'
       // Yes.
       if (validation.reason === 'not-in-dictionary') {
         toast.error("Not in dictionary");
       } else {
         toast.error("Invalid word");
       }
       return;
    }

    const word = validation.word || trimmed; // maintain casing if returned
    const score = scoreWordLength(word.length);
    const now = new Date().toISOString();

    // Optimistic update
    const newWord = { word, score, timestamp: now };
    setWords(prev => [...prev, newWord]);
    setInput("");
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
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* Board Column */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-[500px]">
          <BoardComponent board={board} highlightedCells={highlightedCells} />
        </div>
      </div>

      {/* Action Panel Column */}
      <div className="w-full">
        <ActionPanel
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          score={totalScore}
          boardStartedAt={boardStartedAt}
          onTimeUp={handleTimeUp}
          words={words}
          isTimeUp={isTimeUp}
        />
      </div>
    </div>
  );
}
