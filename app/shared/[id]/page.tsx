import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { urlIdToBoard } from "@/lib/board/api-helpers";
import { SharedWordGrid } from "@/components/play/shared-word-grid";

export const dynamic = "force-dynamic";

interface SharedBoardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Shared Word Grid - Play Together",
    description: "Play this shared word grid with friends!",
  };
}

export default async function SharedBoardPage({ params }: SharedBoardPageProps) {
  const { id } = await params;

  // Parse the board from the URL ID
  const board = urlIdToBoard(id);

  // If the board ID is invalid, show 404
  if (!board) {
    notFound();
  }

  return <SharedWordGrid board={board} />;
}
