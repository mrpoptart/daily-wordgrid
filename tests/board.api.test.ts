import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash } from "crypto";
import type { BoardResponse } from "../app/api/board/route";

const store = vi.hoisted(() => ({
  inserts: [] as { date: string; letters: string; seed: string }[],
  throwOnInsert: false,
}));

vi.mock("@/db/schema", () => ({
  games: { date: Symbol("games.date") },
}));

vi.mock("@/db/client", () => ({
  db: {
    insert() {
      return {
        values(values: { date: string; letters: string; seed: string }) {
          return {
            onConflictDoUpdate({ set }: { set: { letters: string; seed: string } }) {
              if (store.throwOnInsert) {
                throw new Error("insert failed");
              }

              store.inserts.push({ ...values, ...set });
              return Promise.resolve();
            },
          };
        },
      };
    },
  },
}));

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.BOARD_DAILY_SALT;
  vi.resetModules();
  store.inserts = [];
  store.throwOnInsert = false;
});

afterEach(() => {
  process.env = originalEnv;
});

function flatten(board: BoardResponse["board"]): string {
  let out = "";
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      out += board[r][c];
    }
  }
  return out;
}

function todayUtcStr(): string {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  const d = String(today.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("GET /api/board", () => {
  it("returns ok and deterministic board for provided date with salt", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt";
    const req = new Request("http://localhost/api/board?date=2025-01-02");
    const { GET } = await import("../app/api/board/route");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as BoardResponse;

    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-02");
    expect(json.env.hasDailySalt).toBe(true);

    // shape checks
    expect(Array.isArray(json.board)).toBe(true);
    expect(json.board).toHaveLength(5);
    for (const row of json.board) expect(row).toHaveLength(5);

    // letters integrity
    expect(json.letters).toMatch(/^[A-Z]{25}$/);
    expect(json.letters).toBe(flatten(json.board));
  });

  it("flags hasDailySalt=false when salt not provided", async () => {
    const req = new Request("http://localhost/api/board?date=2025-01-03");
    const { GET } = await import("../app/api/board/route");
    const res = await GET(req);
    const json = (await res.json()) as BoardResponse;
    expect(json.env.hasDailySalt).toBe(false);
    expect(json.date).toBe("2025-01-03");
  });

  it("defaults to today's UTC date when not provided", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt-2";
    const { GET } = await import("../app/api/board/route");
    const res = await GET();
    const json = (await res.json()) as BoardResponse;
    expect(json.date).toBe(todayUtcStr());
    expect(json.letters).toMatch(/^[A-Z]{25}$/);
  });

  it("persists the generated board with hashed seed", async () => {
    process.env.BOARD_DAILY_SALT = "store-salt";
    const { GET } = await import("../app/api/board/route");
    const req = new Request("http://localhost/api/board?date=2025-01-04");

    await GET(req);

    expect(store.inserts).toHaveLength(1);
    const record = store.inserts[0];
    expect(record.date).toBe("2025-01-04");
    expect(record.letters).toMatch(/^[A-Z]{25}$/);

    const expectedSeed = createHash("sha256")
      .update("2025-01-04|store-salt")
      .digest("hex");
    expect(record.seed).toBe(expectedSeed);
  });

  it("does not throw if persistence fails", async () => {
    store.throwOnInsert = true;
    const { GET } = await import("../app/api/board/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
