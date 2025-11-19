import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";
import "@testing-library/jest-dom/vitest";

describe("Home page", () => {
  it("renders the hero title and login call-to-action button", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /daily wordgrid/i }),
    ).toBeInTheDocument();

    const loginLink = screen.getByRole("link", { name: /log in to play/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
