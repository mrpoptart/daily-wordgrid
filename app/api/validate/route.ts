import { NextResponse } from "next/server";
import { generateBoardForDate } from "@/lib/board/generate";
import { flattenBoard, resolveBoardDate, resolveDailySalt } from "@/lib/board/api-helpers";
import type { Coord } from "@/lib/validation/adjacency";
import { validateWord, type WordCheck } from "@/lib/validation/words";

export type ValidateRequestBody = {
  date?: string | null;
  path?: unknown;
};

export type ValidateResponse = {
  status: "ok";
  date: string;
  env: {
    hasDailySalt: boolean;
  };
  letters: string;
  result: WordCheck;
};

export type ValidateErrorResponse = {
  status: "error";
  error: "invalid-json" | "invalid-path";
};

function isCoordTuple(value: unknown): value is Coord {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isInteger(value[0]) &&
    typeof value[1] === "number" &&
    Number.isInteger(value[1])
  );
}

function isCoordArray(value: unknown): value is Coord[] {
  return Array.isArray(value) && value.every(isCoordTuple);
}

export async function POST(req: Request) {
  let body: ValidateRequestBody;
  try {
    body = (await req.json()) as ValidateRequestBody;
  } catch {
    const errorBody: ValidateErrorResponse = { status: "error", error: "invalid-json" };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (!isCoordArray(body.path)) {
    const errorBody: ValidateErrorResponse = { status: "error", error: "invalid-path" };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // Ignore timezone params and headers
  const date = resolveBoardDate(typeof body.date === "string" ? body.date : null);
  const { salt, hasDailySalt } = resolveDailySalt();
  const board = generateBoardForDate(date, salt);
  const result = validateWord(board, body.path);

  const response: ValidateResponse = {
    status: "ok",
    date,
    env: { hasDailySalt },
    letters: flattenBoard(board),
    result,
  };

  return NextResponse.json(response, { status: 200 });
}
