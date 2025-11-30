import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "@/app/page";
import "@testing-library/jest-dom/vitest";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      replace: () => null,
    };
  },
}));

describe("Home page", () => {
  it("renders the hero title and login call-to-action button", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /daily wordgrid/i }),
    ).toBeInTheDocument();

    const loginLink = screen.getByRole("link", { name: /play now/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
