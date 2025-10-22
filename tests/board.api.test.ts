import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, type BoardResponse } from "../app/api/board/route";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.BOARD_DAILY_SALT;
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
    const res = await GET(req);
    const json = (await res.json()) as BoardResponse;
    expect(json.env.hasDailySalt).toBe(false);
    expect(json.date).toBe("2025-01-03");
  });

  it("defaults to today's UTC date when not provided", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt-2";
    const res = await GET();
    const json = (await res.json()) as BoardResponse;
    expect(json.date).toBe(todayUtcStr());
    expect(json.letters).toMatch(/^[A-Z]{25}$/);
  });
});
