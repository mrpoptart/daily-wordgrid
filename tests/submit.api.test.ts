import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { POST, type SubmitResponse, type SubmitErrorResponse } from "@/app/api/submit/route";
import { upsertSubmission } from "@/lib/submissions/save";

vi.mock("@/lib/submissions/save", () => ({
  upsertSubmission: vi.fn().mockResolvedValue({ id: 1 }),
}));

const mockedUpsert = upsertSubmission as unknown as Mock;

describe("POST /api/submit", () => {
  beforeEach(() => {
    mockedUpsert.mockClear();
  });

  afterEach(() => {
    mockedUpsert.mockClear();
  });

  it("persists submission and computes score", async () => {
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({
        userId: " user-42 ",
        date: "2025-01-05",
        words: ["game", " puzzle", "GAME"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as SubmitResponse;
    expect(json.status).toBe("ok");
    expect(json.userId).toBe("user-42");
    expect(json.date).toBe("2025-01-05");
    expect(json.words).toEqual(["GAME", "PUZZLE"]);
    expect(json.wordCount).toBe(2);
    expect(json.score).toBe(4); // GAME (4 letters → 1) + PUZZLE (6 letters → 3)

    expect(mockedUpsert).toHaveBeenCalledTimes(1);
    expect(mockedUpsert).toHaveBeenCalledWith({
      userId: "user-42",
      date: "2025-01-05",
      words: ["GAME", "PUZZLE"],
      score: 4,
    });
  });

  it("defaults date and rejects invalid JSON", async () => {
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: "{ this is not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as SubmitErrorResponse;
    expect(json.error).toBe("invalid-json");
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("validates user id", async () => {
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({ words: ["game"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as SubmitErrorResponse;
    expect(json.error).toBe("invalid-user");
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("validates words payload", async () => {
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", words: ["bad", "ok"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as SubmitErrorResponse;
    expect(json.error).toBe("invalid-words");
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});
