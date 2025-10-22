import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { newDb } from "pg-mem";
import { Pool } from "pg";

// pg-mem setup creates an in-memory Postgres and exposes a pg-compatible Pool
function createTestDb() {
  const mem = newDb();
  // enable some basic pg features
  mem.public.registerFunction({ name: "now", returns: "timestamp", implementation: () => new Date() });
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool();
  return { mem, pool: pool as unknown as Pool };
}

describe("drizzle schema (postgres)", () => {
  let pool: Pool;

  beforeAll(async () => {
    const created = createTestDb();
    pool = created.pool;

    // Create tables using SQL compatible with our pg-core schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        date text NOT NULL UNIQUE,
        letters text NOT NULL,
        seed text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id text NOT NULL,
        date text NOT NULL,
        words text NOT NULL,
        score integer NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT submissions_user_date_unique UNIQUE (user_id, date)
      );
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("insert and query game", async () => {
    const r = await pool.query(
      `INSERT INTO games (date, letters, seed) VALUES ($1, $2, $3) RETURNING id`,
      ["2025-10-22", "ABCDEFGHIJKLMNOP", "seed-1"],
    );
    expect(r.rowCount).toBe(1);

    const rows = (await pool.query(`SELECT * FROM games WHERE date = $1`, ["2025-10-22"]))
      .rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].seed).toBe("seed-1");
  });

  test("unique (user_id, date) on submissions", async () => {
    const r1 = await pool.query(
      `INSERT INTO submissions (user_id, date, words, score) VALUES ($1, $2, $3, $4)`,
      ["user-1", "2025-10-22", "A,B,C", 10],
    );
    expect(r1.rowCount).toBe(1);

    let threw = false;
    try {
      await pool.query(
        `INSERT INTO submissions (user_id, date, words, score) VALUES ($1, $2, $3, $4)`,
        ["user-1", "2025-10-22", "D,E", 5],
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
