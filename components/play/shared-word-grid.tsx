"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

import type { Board } from "@/lib/board/types";
import {
  findPathForWord,
  validateWord,
} from "@/lib/validation/words";
import { scoreWordLength } from "@/lib/scoring";
import { MIN_PATH_LENGTH } from "@/lib/validation/paths";
import { flattenBoard } from "@/lib/board/api-helpers";

import { BoardComponent, InteractionType, FeedbackState, FeedbackType } from "./minimal/Board";
import { WordList } from "./minimal/WordList";

export type SharedWordGridProps = {
  board: Board;
};

type AddedWord = { word: string; score: number };

export function SharedWordGrid({ board }: SharedWordGridProps) {
  // Generate a unique key for this board
  const boardKey = useMemo(() => `shared-words-${flattenBoard(board)}`, [board]);

  const [words, setWords] = useState<AddedWord[]>([]);
  const [input, setInput] = useState("");
  const [dragPath, setDragPath] = useState<{ row: number; col: number }[] | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const totalScore = useMemo(() => {
    return words.reduce((sum, w) => sum + w.score, 0);
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

  const addFeedback = useCallback((row: number, col: number, type: FeedbackType, message?: string) => {
    const id = `${row}-${col}-${Date.now()}`;
    setFeedbacks(prev => [...prev, { id, row, col, type, message }]);

    const timeout = setTimeout(() => {
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      feedbackTimeouts.current.delete(id);
    }, 2000);

    feedbackTimeouts.current.set(id, timeout);
  }, []);

  useEffect(() => {
    return () => {
      feedbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
      feedbackTimeouts.current.clear();
    };
  }, []);

  // Load words from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(boardKey);
      if (saved) {
        const parsed = JSON.parse(saved) as AddedWord[];
        setWords(parsed);
      }
    } catch (err) {
      console.error("Failed to load words from localStorage:", err);
    }
  }, [boardKey]);

  // Save words to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(boardKey, JSON.stringify(words));
    } catch (err) {
      console.error("Failed to save words to localStorage:", err);
    }
  }, [words, boardKey]);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;

    const rawWord = input.trim().toUpperCase();
    const path = findPathForWord(board, rawWord);

    if (!path) {
      toast.error("Word not found on board");
      setInput("");
      return;
    }

    const check = validateWord(board, path);

    if (!check.ok) {
      if (check.reason === "too-short") {
        toast.error(`Word must be at least ${MIN_PATH_LENGTH} letters`);
      } else if (check.reason === "not-in-dictionary") {
        toast.error("Not in dictionary");
      } else {
        toast.error("Invalid word");
      }
      // Show invalid feedback on last cell
      if (path.length > 0) {
        const [row, col] = path[path.length - 1];
        addFeedback(row, col, 'invalid');
      }
      setInput("");
      return;
    }

    const actualWord = check.word!;

    // Check for duplicates
    const alreadyAdded = words.some((w) => w.word === actualWord);
    if (alreadyAdded) {
      toast.error("Already added!");
      // Show duplicate feedback on last cell
      if (path.length > 0) {
        const [row, col] = path[path.length - 1];
        addFeedback(row, col, 'duplicate');
      }
      setInput("");
      return;
    }

    const score = scoreWordLength(actualWord.length);
    const newWord: AddedWord = {
      word: actualWord,
      score,
    };

    setWords(prev => {
      const updated = [...prev, newWord];
      console.log("Adding word:", actualWord, "New total:", updated.length, "words");
      return updated;
    });

    // Show success feedback on last cell
    if (path.length > 0) {
      const [row, col] = path[path.length - 1];
      addFeedback(row, col, 'success', `+${score}`);
    }

    toast.success(`+${score} points`);
    setInput("");
  }, [input, board, words, addFeedback]);

  const handleInteraction = useCallback((row: number, col: number, type: InteractionType) => {
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
          // Also update input to remove last letter
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
        // Submit with the drag path for feedback
        handleSubmit();
      }
      setDragPath(null);
    }
  }, [dragPath, board, handleSubmit]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Shared Word Grid
          </h1>
          <p className="text-slate-400">Find as many words as you can!</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Link
            href="/share"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-white/10"
          >
            🔄 New Board
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            📋 Share
          </button>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {totalScore} points
          </div>
          <div className="text-sm text-slate-400">
            {words.length} {words.length === 1 ? 'word' : 'words'} found
          </div>
        </div>

        {/* Board */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <BoardComponent
              board={board}
              highlightedCells={highlightedCells}
              onInteraction={handleInteraction}
              feedbacks={feedbacks}
            />
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Type a word or drag on the board..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
            />
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors"
            >
              Submit
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Minimum {MIN_PATH_LENGTH} letters. Drag on the board or type to find words.
          </p>
        </div>

        {/* Words List */}
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Found Words ({words.length})</h2>
          <WordList
            words={words}
            emptyMessage="No words found yet. Start typing or drag on the board!"
            className="flex flex-col"
          />
        </div>
      </div>
    </div>
  );
}
