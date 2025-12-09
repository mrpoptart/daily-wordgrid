import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST, type ValidateErrorResponse, type ValidateResponse } from "../app/api/validate/route";

const originalEnv = process.env;

// Path for "ROAM" on the board generated for 2025-01-02 with salt "unit-test-salt"
// Board:
// E A L R O
// O R M T G
// N S N A S
// N Z D A R
// T I O F P
const VALID_PATH: [number, number][] = [
  [1, 1], // R
  [1, 0], // O
  [0, 1], // A
  [1, 2], // M
];

const INVALID_PATH: [number, number][] = [
  [0, 0],
  [0, 2],
  [0, 3],
  [0, 4],
];

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.useRealTimers();
});

afterEach(() => {
  process.env = originalEnv;
  vi.useRealTimers();
});

describe("POST /api/validate", () => {
  it("validates a path and returns dictionary word when salt present", async () => {
    process.env.BOARD_DAILY_SALT = "unit-test-salt";

    const res = await POST(
      new Request("http://localhost/api/validate", {
        method: "POST",
        body: JSON.stringify({ date: "2025-01-02", path: VALID_PATH }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as ValidateResponse;
    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-02");
    expect(json.env.hasDailySalt).toBe(true);
    expect(json.result.ok).toBe(true);
    expect(json.result.word).toBe("ROAM");
    expect(json.letters).toMatch(/^[A-Z]{25}$/);
  });

  it("returns invalid-path error for malformed coordinate arrays", async () => {
    const res = await POST(
      new Request("http://localhost/api/validate", {
        method: "POST",
        body: JSON.stringify({ date: "2025-01-02", path: "oops" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ValidateErrorResponse;
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-path");
  });

  it("defaults date when omitted and indicates hasDailySalt=false", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 5, 12)));

    const res = await POST(
      new Request("http://localhost/api/validate", {
        method: "POST",
        body: JSON.stringify({ path: INVALID_PATH }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as ValidateResponse;
    expect(json.status).toBe("ok");
    expect(json.date).toBe("2025-01-05");
    expect(json.env.hasDailySalt).toBe(false);
    expect(json.result.ok).toBe(false);
    expect(json.result.reason).toBe("invalid-path");
  });

  it("rejects invalid JSON payloads", async () => {
    const res = await POST(
      new Request("http://localhost/api/validate", {
        method: "POST",
        body: "{", // malformed JSON
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ValidateErrorResponse;
    expect(json.status).toBe("error");
    expect(json.error).toBe("invalid-json");
  });
});
