import { describe, expect, test, vi } from "vitest";
import { GET, HealthResponse } from "@/app/api/health/route";

// Mock PocketBase
vi.mock("@/lib/pocketbase", () => ({
  pb: {
    health: {
      check: vi.fn().mockResolvedValue({ code: 200 }),
    },
  },
}));

describe("Health API", () => {
  test("returns status ok and environment flags", async () => {
    // Reset env vars
    const oldPocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://127.0.0.1:8090";

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.env.hasPocketBaseUrl).toBe(true);
    expect(json.env.pocketBaseHealth).toBe(true);

    // Restore env
    process.env.NEXT_PUBLIC_POCKETBASE_URL = oldPocketBaseUrl;
  });

  test("handles missing PocketBase URL", async () => {
    const oldPocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    delete process.env.NEXT_PUBLIC_POCKETBASE_URL;

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.env.hasPocketBaseUrl).toBe(false);

    process.env.NEXT_PUBLIC_POCKETBASE_URL = oldPocketBaseUrl;
  });
});
