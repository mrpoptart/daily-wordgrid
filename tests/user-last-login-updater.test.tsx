import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserLastLoginUpdater } from "@/components/auth/user-last-login-updater";

const mockGetCurrentUser = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock("@/lib/firebase", () => ({
  db: {},
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => "SERVER_TIMESTAMP",
}));

describe("UserLastLoginUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates last_login when an existing user is logged in", async () => {
    mockGetCurrentUser.mockResolvedValue({ uid: "user-123", email: "a@b.c", displayName: "A" });
    mockGetDoc.mockResolvedValue({ exists: () => true });

    render(<UserLastLoginUpdater />);

    await vi.waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });

    expect(mockGetDoc).toHaveBeenCalledWith({ path: "users/user-123" });
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/user-123" },
      { email: "a@b.c", last_login: "SERVER_TIMESTAMP" },
      { merge: true }
    );
  });

  it("creates the profile on first login", async () => {
    mockGetCurrentUser.mockResolvedValue({ uid: "user-456", email: "new@b.c", displayName: "New" });
    mockGetDoc.mockResolvedValue({ exists: () => false });

    render(<UserLastLoginUpdater />);

    await vi.waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/user-456" },
      expect.objectContaining({
        id: "user-456",
        email: "new@b.c",
        full_name: "New",
        created_at: "SERVER_TIMESTAMP",
        last_login: "SERVER_TIMESTAMP",
      }),
      { merge: true }
    );
  });

  it("does not update last_login when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    render(<UserLastLoginUpdater />);

    await vi.waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
