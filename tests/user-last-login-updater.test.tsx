import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

// Mock Supabase
const mockUpdate = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
const mockFrom = vi.fn().mockReturnValue({
  update: mockUpdate,
});
const mockEq = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
// Chain for update().eq()
mockUpdate.mockReturnValue({
  eq: mockEq,
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
    expect(mockUpdate).toHaveBeenCalledWith({
      last_login: expect.any(String), // We can't easily match the exact ISO string
    });
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
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
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
