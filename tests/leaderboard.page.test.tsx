import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import LeaderboardPage from "@/app/leaderboard/page";
import type { LeaderboardResponse } from "@/app/api/leaderboard/route";
import "@testing-library/jest-dom/vitest";

const sampleResponse: LeaderboardResponse = {
  status: "ok",
  date: "2025-01-01",
  limit: 5,
  totalPlayers: 2,
  entries: [
    {
      rank: 1,
      userId: "player-one",
      score: 42,
      words: ["TEST", "WORD"],
      submittedAt: "2025-01-01T05:00:00.000Z",
    },
    {
      rank: 2,
      userId: "player-two",
      score: 30,
      words: ["GRID"],
      submittedAt: "2025-01-01T04:00:00.000Z",
    },
  ],
};

describe("Leaderboard page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders standings when data loads", async () => {
    (fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      json: async () => sampleResponse,
    });

    const page = await LeaderboardPage({});
    render(page);

    expect(screen.getByRole("heading", { name: /daily standings/i })).toBeInTheDocument();
    expect(screen.getByText(/player-one/i)).toBeInTheDocument();
    expect(screen.getByText(/player-two/i)).toBeInTheDocument();
    expect(screen.getByText(/limit 5/i)).toBeInTheDocument();
    expect(screen.getByText(/2025-01-01/i)).toBeInTheDocument();
  });

  it("shows an offline state when the fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (fetch as unknown as Mock).mockRejectedValue(new Error("network error"));

    const page = await LeaderboardPage({});
    render(page);

    expect(screen.getByText(/leaderboard unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/please retry later or check your connection/i),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("passes a valid date search param to the API", async () => {
    (fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      json: async () => sampleResponse,
    });

    const page = await LeaderboardPage({ searchParams: { date: "2025-02-02" } });
    render(page);

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/leaderboard?date=2025-02-02", {
      cache: "no-store",
    });
  });

  it("ignores malformed date search params", async () => {
    (fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      json: async () => sampleResponse,
    });

    const page = await LeaderboardPage({ searchParams: { date: "02-02-2025" } });
    render(page);

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/leaderboard", { cache: "no-store" });
  });
});
