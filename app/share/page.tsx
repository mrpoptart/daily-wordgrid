import { redirect } from "next/navigation";
import { generateRandomBoard } from "@/lib/board/generate";
import { boardToUrlId } from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";

export default function SharePage() {
  // Generate a random board
  const board = generateRandomBoard();

  // Convert the board to a URL-friendly ID
  const boardId = boardToUrlId(board);

  // Redirect to the shared board page
  redirect(`/shared/${boardId}`);
}
