"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  boardStartedAt: string | null;
  onTimeUp: () => void;
  isPaused?: boolean;
  totalPausedMs?: number;
}

export function Timer({ boardStartedAt, onTimeUp, isPaused = false, totalPausedMs = 0 }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!boardStartedAt) {
      setTimeRemaining(300);
      return;
    }

    if (isPaused) return;

    const checkTime = () => {
      const now = new Date().getTime();
      const start = new Date(boardStartedAt).getTime();
      const elapsedSeconds = Math.floor((now - start - totalPausedMs) / 1000);
      const remaining = Math.max(0, 300 - elapsedSeconds);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        onTimeUp();
        return true;
      }
      return false;
    };

    // Run immediately
    const isDone = checkTime();
    if (isDone) return;

    const interval = setInterval(() => {
      const done = checkTime();
      if (done) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [boardStartedAt, onTimeUp, isPaused, totalPausedMs]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <span className="font-mono text-slate-100">
      {formattedTime}
    </span>
  );
}
