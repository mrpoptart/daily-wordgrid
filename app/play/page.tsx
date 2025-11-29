import { fetchBoard } from "@/lib/board/fetch";
import { WordGrid } from "@/components/play/word-grid";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

export const metadata = {
  title: "Play • Daily Wordgrid",
  description: "Find words in today's board.",
};

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
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans">
      <UserLastLoginUpdater />
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-16">
        <WordGrid board={boardData.board} boardDate={boardData.date} />
      </div>
    </div>
  );
}
