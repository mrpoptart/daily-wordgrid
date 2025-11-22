import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardResponse } from "@/app/api/board/route";
import PlayPage from "@/app/play/page";

vi.mock("@/lib/supabase/session", () => ({
  hasSupabaseSessionCookie: vi.fn(),
}));

vi.mock("@/lib/board/fetch", () => ({
  fetchBoard: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const sampleBoard: BoardResponse = {
  status: "ok",
  date: "2025-03-04",
  board: [
    ["A", "B", "C", "D", "E"],
    ["F", "G", "H", "I", "J"],
    ["K", "L", "M", "N", "O"],
    ["P", "Q", "R", "S", "T"],
    ["U", "V", "W", "X", "Y"],
  ],
  letters: "ABCDEFGHIJKLMNOPQRSTUVWXY",
  env: {
    hasDailySalt: true,
  },
};

describe("Play page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the board when logged in and data loads", async () => {
    const hasSupabaseSessionCookie = vi.mocked(
      (await import("@/lib/supabase/session")).hasSupabaseSessionCookie,
    );
    const fetchBoard = vi.mocked((await import("@/lib/board/fetch")).fetchBoard);

    hasSupabaseSessionCookie.mockResolvedValue(true);
    fetchBoard.mockResolvedValue(sampleBoard);

    render(await PlayPage());

    expect(
      screen.getByRole("heading", { name: /today's board/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("grid", { name: /interactive daily board/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });
});
