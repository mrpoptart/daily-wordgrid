"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  boardStartedAt: string | null;
  onTimeUp: () => void;
}

export function Timer({ boardStartedAt, onTimeUp }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!boardStartedAt) {
      setTimeRemaining(300);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(boardStartedAt).getTime();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, 300 - elapsedSeconds);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        onTimeUp();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [boardStartedAt, onTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <span className="font-mono text-[#1A1A1A]">
      {formattedTime}
    </span>
  );
}
