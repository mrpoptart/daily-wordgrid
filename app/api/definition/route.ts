import { NextResponse } from "next/server";
import { lookupDefinition } from "@/lib/dictionary/definitions";

export type DefinitionResponse = {
  status: "ok";
  word: string;
  definitions: string[];
  partOfSpeech?: string;
} | {
  status: "not-found";
  word: string;
} | {
  status: "error";
  error: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word");

  if (!word || typeof word !== "string" || word.trim().length === 0) {
    const errorBody: DefinitionResponse = {
      status: "error",
      error: "Missing or invalid word parameter"
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  try {
    const result = await lookupDefinition(word);

    if (!result) {
      const notFoundBody: DefinitionResponse = {
        status: "not-found",
        word: word.trim()
      };
      return NextResponse.json(notFoundBody, { status: 200 });
    }

    const response: DefinitionResponse = {
      status: "ok",
      word: result.word,
      definitions: result.definitions,
      partOfSpeech: result.partOfSpeech,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error looking up definition:", error);
    const errorBody: DefinitionResponse = {
      status: "error",
      error: "Internal server error"
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
