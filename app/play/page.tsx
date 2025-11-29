import type { Metadata } from "next";
import { headers } from "next/headers";

import { fetchBoard } from "@/lib/board/fetch";
import { resolveBoardDate } from "@/lib/board/api-helpers";
import { WordGrid } from "@/components/play/word-grid";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

function formatDisplayDate(boardDate: string): string {
  const [year, month, day] = boardDate.split("-").map(Number);
  if (!year || !month || !day) return boardDate;

  return `${month}/${day}/${year}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const timeZone =
    requestHeaders.get("x-vercel-ip-timezone") ?? requestHeaders.get("x-time-zone");

  const boardDate = resolveBoardDate(null, timeZone);

  return {
    title: `Play Daily Word Grid for ${formatDisplayDate(boardDate)}.`,
    description: "Find words in today's board.",
  };
}

export const dynamic = 'force-dynamic';

export default async function PlayPage() {
  const requestHeaders = await headers();
  const timeZone =
    requestHeaders.get("x-vercel-ip-timezone") ?? requestHeaders.get("x-time-zone");

  const boardData = await fetchBoard({ timeZone });

  if (!boardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-[#1A1A1A]">
        <div>Error loading board</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans">
      <UserLastLoginUpdater />
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-16">
        <WordGrid board={boardData.board} boardDate={boardData.date} />
      </div>
    </div>
  );
}
