import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  letters: text("letters").notNull(),
  seed: text("seed").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
});

export const submissions = sqliteTable(
  "submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    words: text("words").notNull(),
    score: integer("score").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => ({
    userDateUnique: uniqueIndex("submissions_user_date_unique").on(t.userId, t.date),
  })
);
