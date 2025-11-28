import { describe, expect, test, vi } from "vitest";
import { GET, HealthResponse } from "@/app/api/health/route";

// Mock Supabase
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("Health API", () => {
  const oldSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  test("returns status ok and environment flags", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.env.hasSupabaseUrl).toBe(true);
    expect(json.env.supabaseHealth).toBe(true);
  });

  test("handles missing Supabase URL", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.env.hasSupabaseUrl).toBe(false);

    // Restore env
    process.env.NEXT_PUBLIC_SUPABASE_URL = oldSupabaseUrl;
  });
});
