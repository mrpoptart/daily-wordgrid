"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VirtualKeyboardProps {
  onChar: (char: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

export function VirtualKeyboard({ onChar, onDelete, onSubmit }: VirtualKeyboardProps) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2 select-none touch-manipulation">
      {rows.map((row, i) => (
        <div key={i} className="flex w-full justify-center gap-1">
          {row.map((key) => {
            const isEnter = key === "ENTER";
            const isBackspace = key === "⌫";
            const isSpecial = isEnter || isBackspace;

            return (
              <Button
                key={key}
                onClick={(e) => {
                  e.preventDefault();
                  if (isEnter) onSubmit();
                  else if (isBackspace) onDelete();
                  else onChar(key);
                }}
                className={cn(
                  "h-12 min-w-[28px] flex-1 rounded font-bold transition-all active:scale-95 px-0",
                  isSpecial ? "flex-[1.5] text-xs font-semibold uppercase" : "text-lg",
                  "bg-gray-200 text-[#1A1A1A] hover:bg-gray-300 shadow-sm border-b-2 border-gray-300 active:border-b-0 active:translate-y-[2px]"
                )}
                variant="ghost"
                type="button"
              >
                {key}
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
