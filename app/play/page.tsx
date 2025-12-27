import type { Metadata } from "next";

import { fetchBoard } from "@/lib/board/fetch";
import { resolveBoardDate } from "@/lib/board/api-helpers";
import { WordGrid } from "@/components/play/word-grid";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";
import { RequireAuth } from "@/components/auth/require-auth";

function formatDisplayDate(boardDate: string): string {
  const [year, month, day] = boardDate.split("-").map(Number);
  if (!year || !month || !day) return boardDate;

  return `${month}/${day}/${year}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const boardDate = resolveBoardDate(null);

  return {
    title: `Play Daily Word Grid for ${formatDisplayDate(boardDate)}.`,
    description: "Find words in today's board.",
  };
}

export const dynamic = 'force-dynamic';

export default async function PlayPage() {
  const boardData = await fetchBoard();

  if (!boardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-[#1A1A1A]">
        <div>Error loading board</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <RequireAuth>
        <UserLastLoginUpdater />
        <div className="mx-auto max-w-5xl px-[5px] sm:px-4 py-8 lg:py-16">
          <WordGrid board={boardData.board} boardDate={boardData.date} />
        </div>
      </RequireAuth>
    </div>
  );
}
