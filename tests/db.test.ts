import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { sqlite } from "@/db/client";

const TEST_DB = "/workspace/db/test.sqlite";

// Override to use a test database
process.env.DATABASE_PATH = TEST_DB;

describe("drizzle schema", () => {
  beforeAll(() => {
    // Ensure fresh file
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("fs").rmSync(TEST_DB);
    } catch {
      // ignore if file does not exist
    }

    // Create tables using raw SQL matching schema definitions
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        letters TEXT NOT NULL,
        seed TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        words TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        UNIQUE(user_id, date)
      );
    `);
  });

  afterAll(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("fs").rmSync(TEST_DB);
    } catch {
      // ignore if file does not exist
    }
  });

  test("insert and query game", async () => {
    const insert = sqlite.prepare(
      `INSERT INTO games (date, letters, seed) VALUES (?, ?, ?)`
    );
    const result = insert.run("2025-10-22", "ABCDEFGHIJKLMNOP", "seed-1");
    expect(result.changes).toBe(1);

    const rows = sqlite.prepare(`SELECT * FROM games WHERE date = ?`).all("2025-10-22");
    expect(rows).toHaveLength(1);
    expect(rows[0].seed).toBe("seed-1");
  });

  test("unique (user_id, date) on submissions", async () => {
    const insert = sqlite.prepare(
      `INSERT INTO submissions (user_id, date, words, score) VALUES (?, ?, ?, ?)`
    );
    const r1 = insert.run("user-1", "2025-10-22", "A,B,C", 10);
    expect(r1.changes).toBe(1);

    // second insert should violate unique constraint
    let threw = false;
    try {
      insert.run("user-1", "2025-10-22", "D,E", 5);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
