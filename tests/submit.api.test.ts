import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/board/types";
import type { SubmitSuccessResponse } from "../app/api/submit/route";

type StoredSubmission = {
  id: number;
  userId: string;
  date: string;
  words: string;
  score: number;
  createdAt: Date;
};

type StoreState = {
  records: Map<string, StoredSubmission>;
  nextId: number;
};

const storeState = vi.hoisted<StoreState>(() => ({
  records: new Map<string, StoredSubmission>(),
  nextId: 1,
}));

const mockBoard = vi.hoisted(() =>
  [
    ["C", "A", "T", "S", "X"],
    ["H", "O", "U", "S", "E"],
    ["P", "L", "A", "Y", "R"],
    ["D", "O", "G", "S", "T"],
    ["B", "I", "R", "D", "S"],
  ] satisfies Board,
);

const generateBoardMock = vi.hoisted(() => vi.fn(() => mockBoard));

vi.mock("@/lib/board/generate", () => ({
  generateBoardForDate: generateBoardMock,
}));

vi.mock("@/db/client", () => {
  function makeReturning(values: { userId: string; date: string; words: string; score: number }) {
    return async () => {
      const key = `${values.userId}|${values.date}`;
      const now = new Date();
      const existing = storeState.records.get(key);
      if (existing) {
        existing.words = values.words;
        existing.score = values.score;
        existing.createdAt = now;
        return [{ ...existing }];
      }
      const record: StoredSubmission = {
        id: storeState.nextId++,
        userId: values.userId,
        date: values.date,
        words: values.words,
        score: values.score,
        createdAt: now,
      };
      storeState.records.set(key, record);
      return [{ ...record }];
    };
  }

  return {
    db: {
      insert: () => ({
        values(values: { userId: string; date: string; words: string; score: number }) {
          return {
            onConflictDoUpdate() {
              return {
                returning: makeReturning(values),
              };
            },
          };
        },
      }),
    },
  };
});

function resetStore() {
  storeState.records.clear();
  storeState.nextId = 1;
}

beforeEach(() => {
  resetStore();
  generateBoardMock.mockClear();
});

describe("POST /api/submit", () => {
  it("records a submission and returns metadata", async () => {
    const { POST } = await import("../app/api/submit/route");
    const request = new Request("http://localhost/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "user-123",
        date: "2025-01-02",
        words: ["dogs", "house", "dogs"],
        score: 999,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);

    const json = (await res.json()) as SubmitSuccessResponse;
    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-02");
    expect(json.submission.userId).toBe("user-123");
    expect(json.submission.words).toEqual(["DOGS", "HOUSE"]);
    expect(json.submission.score).toBe(3);
    expect(typeof json.submission.id).toBe("number");
    expect(json.submission.createdAt).toMatch(/T/);
  });

  it("upserts on the user/date combination", async () => {
    const { POST } = await import("../app/api/submit/route");
    const baseRequest = {
      method: "POST",
      headers: { "content-type": "application/json" },
    } satisfies RequestInit;

    const first = await POST(
      new Request("http://localhost/api/submit", {
        ...baseRequest,
        body: JSON.stringify({
          userId: "user-456",
          date: "2025-01-03",
          words: ["dogs"],
        }),
      }),
    );
    const firstJson = (await first.json()) as SubmitSuccessResponse;
    const firstId = firstJson.submission.id;
    expect(firstJson.submission.words).toEqual(["DOGS"]);
    expect(firstJson.submission.score).toBe(1);

    const second = await POST(
      new Request("http://localhost/api/submit", {
        ...baseRequest,
        body: JSON.stringify({
          userId: "user-456",
          date: "2025-01-03",
          words: ["house", "cats"],
          score: 42,
        }),
      }),
    );

    const secondJson = (await second.json()) as SubmitSuccessResponse;
    expect(secondJson.submission.id).toBe(firstId);
    expect(secondJson.submission.words).toEqual(["HOUSE", "CATS"]);
    expect(secondJson.submission.score).toBe(3);
  });

  it("validates input payload", async () => {
    const { POST } = await import("../app/api/submit/route");
    const res = await POST(
      new Request("http://localhost/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "", words: [], score: -1 }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("rejects words that are not playable on the generated board", async () => {
    const { POST } = await import("../app/api/submit/route");
    const res = await POST(
      new Request("http://localhost/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-789",
          date: "2025-01-04",
          words: ["bones"],
        }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-words");
  });
});
