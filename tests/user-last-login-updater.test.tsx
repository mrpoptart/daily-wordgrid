import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

// Mock Supabase
const mockUpsert = vi.fn().mockReturnValue({
  select: vi.fn().mockResolvedValue({ error: null }),
});
const mockFrom = vi.fn().mockReturnValue({
  upsert: mockUpsert,
});

const mockGetSession = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

describe("UserLastLoginUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates last_login when user is logged in", async () => {
    // Mock successful session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-123" },
        },
      },
    });

    render(<UserLastLoginUpdater />);

    // Wait for effect
    await vi.waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-123",
        last_login: expect.any(String),
      }),
      { onConflict: "id" }
    );
  });

  it("does not update last_login when user is not logged in", async () => {
    // Mock no session
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    render(<UserLastLoginUpdater />);

    // Wait for effect
    await vi.waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
