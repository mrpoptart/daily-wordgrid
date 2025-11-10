import { db } from "@/db/client";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";

type GameRow = typeof games.$inferSelect;

type GameInput = {
  date: string;
  letters: string;
  seed: string;
};

export async function findGameByDate(date: string): Promise<GameRow | null> {
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.date, date))
    .limit(1);

  return rows[0] ?? null;
}

export async function saveGame(record: GameInput): Promise<GameRow | null> {
  const rows = await db
    .insert(games)
    .values(record)
    .onConflictDoUpdate({
      target: games.date,
      set: {
        letters: record.letters,
        seed: record.seed,
      },
    })
    .returning();

  if (rows.length > 0) {
    return rows[0];
  }

  return findGameByDate(record.date);
}
