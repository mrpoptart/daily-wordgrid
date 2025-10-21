import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, type HealthResponse } from "../app/api/health/route";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("GET /api/health", () => {
  it("returns ok and env flags without exposing secrets", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const res = await GET();
    expect(res.status).toBe(200);

    const json = (await res.json()) as HealthResponse;
    expect(json.status).toBe("ok");
    expect(json.env.hasSupabaseUrl).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(json.env, "vercelEnv")).toBe(
      true,
    );
    expect(
      Object.prototype.hasOwnProperty.call(json.env, "hasVercelUrl"),
    ).toBe(true);

    // Ensure the raw value is not present anywhere in the payload
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("https://example.supabase.co");
  });
});
