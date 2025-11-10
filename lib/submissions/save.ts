import { db, type Database } from "@/db/client";
import { submissions } from "@/db/schema";

export type SubmissionRecord = {
  userId: string;
  date: string;
  words: string[];
  score: number;
};

export type StoredSubmission = {
  id: number;
  userId: string;
  date: string;
  words: string[];
  score: number;
};

export type UpsertOptions = {
  db?: Pick<Database, "insert">;
};

function serializeWords(words: string[]): string {
  return JSON.stringify(words);
}

function parseStoredWords(words: string): string[] {
  try {
    const parsed = JSON.parse(words);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function upsertSubmission(
  record: SubmissionRecord,
  options: UpsertOptions = {},
): Promise<StoredSubmission> {
  const database = (options.db as Database | undefined) ?? db;

  const payload = {
    userId: record.userId,
    date: record.date,
    words: serializeWords(record.words),
    score: record.score,
  };

  const rows = await database
    .insert(submissions)
    .values(payload)
    .onConflictDoUpdate({
      target: [submissions.userId, submissions.date],
      set: {
        words: payload.words,
        score: payload.score,
      },
    })
    .returning({
      id: submissions.id,
      userId: submissions.userId,
      date: submissions.date,
      words: submissions.words,
      score: submissions.score,
    });

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to upsert submission");
  }

  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    words: parseStoredWords(row.words),
    score: row.score,
  };
}
