import { beforeEach, describe, expect, it, vi } from "vitest";
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
        words: ["aids", "gain"],
        score: 5,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);

    const json = (await res.json()) as SubmitSuccessResponse;
    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-02");
    expect(json.submission.userId).toBe("user-123");
    expect(json.submission.words).toEqual(["aids", "gain"]);
    expect(json.submission.score).toBe(5);
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
          words: ["WORD"],
          score: 4,
        }),
      }),
    );
    const firstJson = (await first.json()) as SubmitSuccessResponse;
    const firstId = firstJson.submission.id;

    const second = await POST(
      new Request("http://localhost/api/submit", {
        ...baseRequest,
        body: JSON.stringify({
          userId: "user-456",
          date: "2025-01-03",
          words: ["NEW"],
          score: 7,
        }),
      }),
    );

    const secondJson = (await second.json()) as SubmitSuccessResponse;
    expect(secondJson.submission.id).toBe(firstId);
    expect(secondJson.submission.words).toEqual(["NEW"]);
    expect(secondJson.submission.score).toBe(7);
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
    expect(json.error).toBe("invalid-user");
  });

  it("rejects empty word lists", async () => {
    const { POST } = await import("../app/api/submit/route");
    const res = await POST(
      new Request("http://localhost/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "player", words: [], score: 0 }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-words");
  });

  it("rejects duplicate words regardless of casing", async () => {
    const { POST } = await import("../app/api/submit/route");
    const res = await POST(
      new Request("http://localhost/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "player",
          words: ["Word", " word ", "another"],
          score: 10,
        }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-words");
  });
});
