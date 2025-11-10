import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { BoardResponse } from "../app/api/board/route";

const originalEnv = process.env;

type StoredGame = {
  id: number;
  date: string;
  letters: string;
  seed: string;
};

const storeState = vi.hoisted(() => ({
  records: new Map<string, StoredGame>(),
  nextId: 1,
}));

vi.mock("@/lib/board/game-store", () => {
  return {
    findGameByDate: vi.fn(async (date: string) => {
      const record = storeState.records.get(date);
      return record ? { ...record } : null;
    }),
    saveGame: vi.fn(async (record: { date: string; letters: string; seed: string }) => {
      let stored = storeState.records.get(record.date);
      if (stored) {
        stored.letters = record.letters;
        stored.seed = record.seed;
      } else {
        stored = { id: storeState.nextId++, ...record };
        storeState.records.set(record.date, stored);
      }
      return { ...stored };
    }),
  };
});

beforeEach(async () => {
  process.env = { ...originalEnv };
  delete process.env.BOARD_DAILY_SALT;
  storeState.records.clear();
  storeState.nextId = 1;
  const gameStore = await import("@/lib/board/game-store");
  vi.mocked(gameStore.findGameByDate).mockClear();
  vi.mocked(gameStore.saveGame).mockClear();
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
    const { GET } = await import("../app/api/board/route");
    const req = new Request("http://localhost/api/board?date=2025-01-02");
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
    const { GET } = await import("../app/api/board/route");
    const req = new Request("http://localhost/api/board?date=2025-01-03");
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

  it("returns stored board when a record exists", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt-3";
    const storedLetters = "ABCDEFGHIJKLMNOPQRSTUVWXY";
    storeState.records.set("2025-02-10", {
      id: 1,
      date: "2025-02-10",
      letters: storedLetters,
      seed: "seed-hash",
    });

    const { GET } = await import("../app/api/board/route");
    const res = await GET(
      new Request("http://localhost/api/board?date=2025-02-10"),
    );
    const json = (await res.json()) as BoardResponse;

    expect(json.letters).toBe(storedLetters);
    expect(json.board).toHaveLength(5);
    expect(json.board[0][0]).toBe("A");

    const gameStore = await import("@/lib/board/game-store");
    expect(gameStore.saveGame).not.toHaveBeenCalled();
    expect(gameStore.findGameByDate).toHaveBeenCalledTimes(1);
  });

  it("persists a new board when missing", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt-4";

    const { GET } = await import("../app/api/board/route");
    const res = await GET(
      new Request("http://localhost/api/board?date=2025-02-11"),
    );
    const json = (await res.json()) as BoardResponse;

    expect(json.status).toBe("ok");
    expect(json.letters).toMatch(/^[A-Z]{25}$/);

    const gameStore = await import("@/lib/board/game-store");
    expect(gameStore.saveGame).toHaveBeenCalledTimes(1);
    const [record] = vi.mocked(gameStore.saveGame).mock.calls[0];
    expect(record.date).toBe("2025-02-11");
    expect(record.letters).toBe(json.letters);
    expect(record.seed).toMatch(/^[a-f0-9]{64}$/);
    expect(storeState.records.get("2025-02-11")?.letters).toBe(json.letters);
  });
});
