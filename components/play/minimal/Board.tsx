import React from "react";
import { cn } from "@/lib/utils";
import { Board } from "@/lib/board/types";

interface BoardProps {
  board: Board;
  highlightedCells?: { row: number; col: number }[];
  lastFoundCells?: { row: number; col: number }[];
}

export function BoardComponent({ board, highlightedCells = [], lastFoundCells = [] }: BoardProps) {
  const isHighlighted = (r: number, c: number) =>
    highlightedCells.some(cell => cell.row === r && cell.col === c);

  const isLastFound = (r: number, c: number) =>
    lastFoundCells.some(cell => cell.row === r && cell.col === c);

  return (
    <div className="grid grid-cols-5 border border-[#E0E0E0] bg-[#FAFAFA]">
      {board.map((row, rowIndex) =>
        row.map((letter, colIndex) => {
          const highlighted = isHighlighted(rowIndex, colIndex);
          const lastFound = isLastFound(rowIndex, colIndex);

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                "flex aspect-square items-center justify-center text-3xl font-bold uppercase transition-colors duration-300",
                "border-b border-r border-[#E0E0E0]",
                // Remove right border for last column, bottom border for last row
                colIndex === 4 && "border-r-0",
                rowIndex === 4 && "border-b-0",
                highlighted ? "bg-[#3A7AFE] text-white" :
                lastFound ? "bg-[#E0E0E0] text-[#1A1A1A]" : // Subtle highlight for last found
                "text-[#1A1A1A]"
              )}
            >
              {letter}
            </div>
          );
        })
      )}
    </div>
  );
}
