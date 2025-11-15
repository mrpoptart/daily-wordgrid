import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LeaderboardErrorResponse,
  LeaderboardResponse,
} from "../app/api/leaderboard/route";

type StoredRow = {
  id: number;
  userId: string;
  score: number;
  words: string;
  createdAt: Date | string | null;
};

type StoreState = {
  rows: StoredRow[];
  total: number;
  lastLimit: number | null;
  throwOnQuery: boolean;
};

const store = vi.hoisted<StoreState>(() => ({
  rows: [],
  total: 0,
  lastLimit: null,
  throwOnQuery: false,
}));

vi.mock("@/db/client", () => {
  return {
    db: {
      select(selector: unknown) {
        if (store.throwOnQuery) {
          throw new Error("query failed");
        }

        const isCountSelection =
          typeof selector === "object" && selector !== null && "value" in (selector as Record<string, unknown>);

        if (isCountSelection) {
          return {
            from() {
              return {
                where() {
                  return Promise.resolve([{ value: store.total }]);
                },
              };
            },
          };
        }

        return {
          from() {
            return {
              where() {
                return {
                  orderBy() {
                    return {
                      limit(limitValue: number) {
                        store.lastLimit = limitValue;
                        return Promise.resolve(store.rows.slice(0, limitValue));
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
});

beforeEach(() => {
  store.rows = [];
  store.total = 0;
  store.lastLimit = null;
  store.throwOnQuery = false;
  vi.useRealTimers();
});

describe("GET /api/leaderboard", () => {
  it("returns leaderboard entries for the requested date", async () => {
    store.rows = [
      {
        id: 2,
        userId: "user-b",
        score: 15,
        words: "[\"alpha\"]",
        createdAt: new Date("2025-01-01T00:01:00Z"),
      },
      {
        id: 3,
        userId: "user-c",
        score: 12,
        words: "not-json",
        createdAt: new Date("2025-01-01T00:02:00Z"),
      },
    ];
    store.total = 3;

    const { GET } = await import("../app/api/leaderboard/route");
    const request = new Request("http://localhost/api/leaderboard?date=2025-01-01&limit=2");

    const res = await GET(request);
    expect(res.status).toBe(200);

    const json = (await res.json()) as LeaderboardResponse;
    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-01");
    expect(json.limit).toBe(2);
    expect(json.totalPlayers).toBe(3);
    expect(json.entries).toHaveLength(2);

    expect(json.entries[0]).toMatchObject({
      rank: 1,
      userId: "user-b",
      score: 15,
      words: ["alpha"],
    });
    expect(json.entries[0].submittedAt).toBe("2025-01-01T00:01:00.000Z");

    expect(json.entries[1]).toMatchObject({
      rank: 2,
      userId: "user-c",
      score: 12,
      words: [],
    });
    expect(json.entries[1].submittedAt).toBe("2025-01-01T00:02:00.000Z");

    expect(store.lastLimit).toBe(2);
  });

  it("assigns identical ranks when scores tie", async () => {
    store.rows = [
      {
        id: 10,
        userId: "player-1",
        score: 30,
        words: "[\"first\"]",
        createdAt: new Date("2025-04-01T00:00:05Z"),
      },
      {
        id: 12,
        userId: "player-2",
        score: 30,
        words: "[\"second\"]",
        createdAt: new Date("2025-04-01T00:00:10Z"),
      },
      {
        id: 14,
        userId: "player-3",
        score: 24,
        words: "[\"third\"]",
        createdAt: new Date("2025-04-01T00:01:00Z"),
      },
    ];
    store.total = 3;

    const { GET } = await import("../app/api/leaderboard/route");
    const request = new Request("http://localhost/api/leaderboard?date=2025-04-01&limit=3");

    const res = await GET(request);
    expect(res.status).toBe(200);

    const json = (await res.json()) as LeaderboardResponse;
    expect(json.entries).toEqual([
      expect.objectContaining({ userId: "player-1", rank: 1, score: 30 }),
      expect.objectContaining({ userId: "player-2", rank: 1, score: 30 }),
      expect.objectContaining({ userId: "player-3", rank: 3, score: 24 }),
    ]);
  });

  it("defaults the date and limit when omitted", async () => {
    store.rows = [
      {
        id: 1,
        userId: "user-a",
        score: 7,
        words: "[\"word\"]",
        createdAt: new Date("2025-02-02T12:00:00Z"),
      },
    ];
    store.total = 1;

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-02T08:00:00Z"));

    const { GET } = await import("../app/api/leaderboard/route");
    const request = new Request("http://localhost/api/leaderboard");

    const res = await GET(request);
    expect(res.status).toBe(200);

    const json = (await res.json()) as LeaderboardResponse;
    expect(json.date).toBe("2025-02-02");
    expect(json.limit).toBe(25);
    expect(json.entries).toHaveLength(1);
    expect(store.lastLimit).toBe(25);
  });

  it("rejects invalid limit values", async () => {
    const { GET } = await import("../app/api/leaderboard/route");
    const request = new Request("http://localhost/api/leaderboard?limit=abc");

    const res = await GET(request);
    expect(res.status).toBe(400);

    const json = (await res.json()) as LeaderboardErrorResponse;
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-limit");
  });

  it("handles database failures gracefully", async () => {
    store.throwOnQuery = true;

    const { GET } = await import("../app/api/leaderboard/route");
    const request = new Request("http://localhost/api/leaderboard?date=2025-03-01");

    const res = await GET(request);
    expect(res.status).toBe(500);

    const json = (await res.json()) as LeaderboardErrorResponse;
    expect(json.status).toBe("error");
    expect(json.error).toBe("database-error");
  });
});
