import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FetchSubmissionResponse,
  SubmitSuccessResponse,
} from "../app/api/submit/route";

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

  function findFirst({
    where,
  }: {
    where?: (
      fields: { userId: string; date: string },
      operators: { eq: (field: string, value: string) => boolean; and: (...values: boolean[]) => boolean },
    ) => boolean;
  }) {
    const operators = {
      eq: (field: string, value: string) => field === value,
      and: (...values: boolean[]) => values.every(Boolean),
    } as const;

    const match = Array.from(storeState.records.values()).find((record) =>
      where ? where({ userId: record.userId, date: record.date }, operators) : true,
    );

    return match ? { ...match } : null;
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
      query: {
        submissions: { findFirst },
      },
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

  it("stores progress per unique user so players resume their own boards", async () => {
    const { POST } = await import("../app/api/submit/route");
    const requestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
    } satisfies RequestInit;

    await POST(
      new Request("http://localhost/api/submit", {
        ...requestInit,
        body: JSON.stringify({
          userId: "alpha-player",
          date: "2025-01-05",
          words: ["alpha"],
          score: 4,
        }),
      }),
    );

    await POST(
      new Request("http://localhost/api/submit", {
        ...requestInit,
        body: JSON.stringify({
          userId: "beta-player",
          date: "2025-01-05",
          words: ["beta"],
          score: 6,
        }),
      }),
    );

    expect(storeState.records.size).toBe(2);
    expect(storeState.records.get("alpha-player|2025-01-05")?.words).toBe('["alpha"]');
    expect(storeState.records.get("beta-player|2025-01-05")?.words).toBe('["beta"]');
  });

  it("lets players return later and keep adding words to the same record", async () => {
    const { POST } = await import("../app/api/submit/route");
    const baseRequest = {
      method: "POST",
      headers: { "content-type": "application/json" },
    } satisfies RequestInit;

    const first = await POST(
      new Request("http://localhost/api/submit", {
        ...baseRequest,
        body: JSON.stringify({
          userId: "returning", // persist initial progress
          date: "2025-01-06",
          words: ["first"],
          score: 4,
        }),
      }),
    );

    const firstJson = (await first.json()) as SubmitSuccessResponse;
    expect(firstJson.submission.words).toEqual(["first"]);

    const second = await POST(
      new Request("http://localhost/api/submit", {
        ...baseRequest,
        body: JSON.stringify({
          userId: "returning", // same user/date should update existing row
          date: "2025-01-06",
          words: ["first", "second"],
          score: 11,
        }),
      }),
    );

    const secondJson = (await second.json()) as SubmitSuccessResponse;
    expect(secondJson.submission.id).toBe(firstJson.submission.id);
    expect(secondJson.submission.words).toEqual(["first", "second"]);
    expect(storeState.records.get("returning|2025-01-06")?.words).toBe('["first","second"]');
  });

  it("returns a saved submission when requested", async () => {
    const { GET, POST } = await import("../app/api/submit/route");

    await POST(
      new Request("http://localhost/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "hydrated", // persist initial progress
          date: "2025-02-01",
          words: ["one", "two"],
          score: 3,
        }),
      }),
    );

    const response = await GET(new Request("http://localhost/api/submit?userId=hydrated&date=2025-02-01"));
    const json = (await response.json()) as FetchSubmissionResponse;

    expect(json.submission?.userId).toBe("hydrated");
    expect(json.submission?.words).toEqual(["one", "two"]);
    expect(json.submission?.score).toBe(3);
  });

  it("returns null when no submission exists for the user/date", async () => {
    const { GET } = await import("../app/api/submit/route");

    const response = await GET(new Request("http://localhost/api/submit?userId=missing&date=2025-03-01"));
    const json = (await response.json()) as FetchSubmissionResponse;

    expect(json.status).toBe("ok");
    expect(json.submission).toBeNull();
  });

  it("gracefully handles malformed words payloads", async () => {
    const { GET } = await import("../app/api/submit/route");

    storeState.records.set("broken|2025-03-02", {
      id: 99,
      userId: "broken",
      date: "2025-03-02",
      words: "{not-json}",
      score: 0,
      createdAt: new Date(),
    });

    const response = await GET(new Request("http://localhost/api/submit?userId=broken&date=2025-03-02"));
    const json = (await response.json()) as FetchSubmissionResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.submission).toBeNull();
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
