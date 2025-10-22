import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBoardForDate } from "@/lib/board/generate";

export const runtime = "edge";

const UppercaseLetterSchema = z.string().length(1).regex(/^[A-Z]$/);
const BoardSchema = z
  .array(z.array(UppercaseLetterSchema).length(5))
  .length(5);

const QuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const BoardResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  board: BoardSchema,
});

export type BoardResponse = z.infer<typeof BoardResponseSchema>;

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req?: Request) {
  try {
    const url = req?.url ? new URL(req.url) : null;
    const dateParam = url?.searchParams.get("date") ?? undefined;

    const parsed = QuerySchema.safeParse({ date: dateParam });
    const dateStr = parsed.success && parsed.data.date
      ? parsed.data.date
      : formatUtcDate(new Date());

    const salt = process.env.BOARD_DAILY_SALT || "local-dev";
    const board = generateBoardForDate(dateStr, salt);

    // Validate the board and response shape with Zod
    BoardSchema.parse(board);
    const body: BoardResponse = BoardResponseSchema.parse({ date: dateStr, board });

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
