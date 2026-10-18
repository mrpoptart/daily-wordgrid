/**
 * Firestore data model. Mirrors the former Supabase/Postgres tables one-to-one:
 * same collection names, same field names (snake_case), same value types.
 *
 *   Postgres            → Firestore
 *   uuid / text         → string
 *   integer             → number
 *   date (YYYY-MM-DD)   → string "YYYY-MM-DD"
 *   timestamptz         → Timestamp
 *
 * Composite primary keys / unique constraints become deterministic document
 * IDs, so a duplicate insert collides with an existing document (and is
 * rejected by firestore.rules, like a unique-constraint violation).
 */

export const COLLECTIONS = {
  users: "users",
  words: "words",
  dailyBoards: "daily_boards",
  games: "games",
  boardWordCounts: "board_word_counts",
  submissions: "submissions",
} as const;

/** users/{id} — id is the Firebase Auth uid (Supabase auth.users.id for migrated users). */
export type UserDoc<TTimestamp = unknown> = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: TTimestamp;
  last_login: TTimestamp | null;
};

/** words/{user_id}_{board_date}_{word} — UNIQUE(user_id, word, board_date). */
export type WordDoc<TTimestamp = unknown> = {
  id: string;
  user_id: string;
  word: string;
  score: number;
  board_date: string;
  created_at: TTimestamp;
  elapsed_at: number | null;
};

/** daily_boards/{user_id}_{board_date} — PRIMARY KEY (user_id, board_date). */
export type DailyBoardDoc<TTimestamp = unknown> = {
  user_id: string;
  board_date: string;
  board_started: TTimestamp;
  elapsed_seconds: number;
  time_limit_seconds: number;
};

/** games/{date} — server-only. */
export type GameDoc<TTimestamp = unknown> = {
  date: string;
  letters: string;
  seed: string;
  created_at: TTimestamp;
};

/** board_word_counts/{board_date} — server-written, publicly readable. */
export type BoardWordCountsDoc<TTimestamp = unknown> = {
  board_date: string;
  total_words: number;
  count_4: number;
  count_5: number;
  count_6: number;
  count_7: number;
  count_8_plus: number;
  created_at: TTimestamp;
};

/** submissions/{user_id}_{date} — UNIQUE(user_id, date); server-only. */
export type SubmissionDoc<TTimestamp = unknown> = {
  id: string;
  user_id: string;
  date: string;
  words: string; // JSON-encoded string[]
  score: number;
  created_at: TTimestamp;
};

export const wordDocId = (userId: string, boardDate: string, word: string) =>
  `${userId}_${boardDate}_${word}`;

export const dailyBoardDocId = (userId: string, boardDate: string) => `${userId}_${boardDate}`;

export const submissionDocId = (userId: string, date: string) => `${userId}_${date}`;

/** Converts a Firestore Timestamp (client or admin SDK), Date or string into an ISO string. */
export function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}
