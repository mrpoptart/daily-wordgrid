import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Board } from "@/lib/board/types";

export type InteractionType = 'start' | 'move' | 'end';

export type FeedbackType = 'success' | 'duplicate' | 'invalid';

export interface FeedbackState {
  type: FeedbackType;
  message?: string;
  row: number;
  col: number;
}

interface BoardProps {
  board: Board;
  highlightedCells?: { row: number; col: number }[];
  onInteraction?: (row: number, col: number, type: InteractionType) => void;
  feedback?: FeedbackState | null;
}

export function BoardComponent({ board, highlightedCells = [], onInteraction, feedback }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  // specific state to track if we are currently in a drag operation (mouse or touch)
  // to avoid triggering move events when just hovering with mouse
  const isDragging = useRef(false);

  const isHighlighted = (r: number, c: number) =>
    highlightedCells.some(cell => cell.row === r && cell.col === c);

  const getCellFromPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // traverse up to find the cell div if we hit a child
    const cell = element.closest('[data-board-cell="true"]');
    if (!cell) return null;

    const row = parseInt(cell.getAttribute('data-row') || '-1');
    const col = parseInt(cell.getAttribute('data-col') || '-1');

    if (row >= 0 && col >= 0) return { row, col };
    return null;
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to avoid scrolling while starting to drag on board
    // However, we might want to allow scrolling if the user taps?
    // Usually Boggle boards are fixed.
    // Let's prevent default only if we hit a cell?
    // Actually, "drag on the board" implies we consume the gesture.

    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);

    if (cell) {
      isDragging.current = true;
      if (e.cancelable) e.preventDefault();
      onInteraction?.(cell.row, cell.col, 'start');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);

    if (cell) {
      onInteraction?.(cell.row, cell.col, 'move');
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // We don't necessarily have a cell here, but we signal end.
    // We pass -1, -1 to indicate no specific cell, or the last one?
    // The parent manages the path, so just signal end.
    onInteraction?.(-1, -1, 'end');
  };

  // Mouse Handlers (for desktop/testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) {
      isDragging.current = true;
      e.preventDefault(); // prevent text selection
      onInteraction?.(cell.row, cell.col, 'start');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();

    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) {
      onInteraction?.(cell.row, cell.col, 'move');
    }
  };

  // Attach global mouseup listener to handle release outside board
  useEffect(() => {
    const handleGlobalMouseUp = () => {
        if (isDragging.current) {
            isDragging.current = false;
            onInteraction?.(-1, -1, 'end');
        }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [onInteraction]);


  return (
    <div
      ref={boardRef}
      className="grid grid-cols-5 gap-2 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      // onMouseUp handled globally/locally
    >
      {board.map((row, rowIndex) =>
        row.map((letter, colIndex) => {
          const highlighted = isHighlighted(rowIndex, colIndex);
          const isFeedbackCell = feedback?.row === rowIndex && feedback?.col === colIndex;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              data-board-cell="true"
              data-row={rowIndex}
              data-col={colIndex}
              className={cn(
                "relative flex aspect-square items-center justify-center text-2xl sm:text-3xl font-bold uppercase transition-colors duration-150 rounded-full border",
                highlighted
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : "bg-slate-900 text-slate-100 border-white/10 hover:border-emerald-500/50",
                "cursor-pointer" // Indicate interactivity
              )}
            >
              {letter}
              {isFeedbackCell && (
                <div className="absolute top-1/2 left-1/2 z-50 pointer-events-none animate-float-up">
                    {/* Content based on feedback.type */}
                    {feedback.type === 'success' && (
                       <div className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-full shadow-lg shadow-black/20 text-sm flex items-center whitespace-nowrap border border-white/20">
                           {feedback.message}
                       </div>
                    )}
                    {feedback.type === 'duplicate' && (
                        <div className="bg-amber-500 rounded-full p-1 text-white shadow-lg border border-white/20">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5">
                              <polyline points="20 6 9 17 4 12" />
                           </svg>
                        </div>
                    )}
                    {feedback.type === 'invalid' && (
                        <div className="bg-red-500 rounded-full p-1 text-white shadow-lg">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                           </svg>
                        </div>
                    )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
