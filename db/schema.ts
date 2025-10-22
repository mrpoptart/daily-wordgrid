import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const games = pgTable("games", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull().unique(),
  letters: text("letters").notNull(),
  seed: text("seed").notNull(),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const submissions = pgTable(
  "submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    words: text("words").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userDateUnique: uniqueIndex("submissions_user_date_unique").on(t.userId, t.date),
  })
);
