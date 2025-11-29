import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordGrid } from "@/components/play/word-grid";
import type { Board } from "@/lib/board/types";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);

const testBoard: Board = [
  ["T", "E", "S", "T", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
];

describe("WordGrid", () => {
  it("allows typing a word and submitting", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByLabelText(/word/i);
    fireEvent.change(input, { target: { value: "TEST" } });

    fireEvent.keyDown(input, { key: " " });

    await waitFor(() => {
        expect(screen.getByText("TEST")).toBeInTheDocument();
        expect(screen.getByText("(1 pts)")).toBeInTheDocument();
    });
  });

  it("highlights the board when typing a valid word", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByLabelText(/word/i);
    fireEvent.change(input, { target: { value: "TEST" } });

    // Assuming highlighted cells have a specific class or style.
    // In my implementation: bg-[#3A7AFE] text-white

    // We can check if the cells are highlighted by checking classes
    // The cells are divs with text content.

    // T (0,0)
    const tiles = screen.getAllByText("T");
    const firstT = tiles[0];

    // Wait for highlight update
    await waitFor(() => {
        expect(firstT).toHaveClass("bg-[#3A7AFE]");
    });
  });

  it("does not submit invalid words", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByLabelText(/word/i);
    fireEvent.change(input, { target: { value: "ZZZZ" } });

    fireEvent.keyDown(input, { key: "Enter" });

    // Should verify toast error or no word added
    // Toasts are hard to test with just screen.getByText depending on the library
    // But we can check that the word is NOT in the list
    expect(screen.queryByText("ZZZZ")).not.toBeInTheDocument();
  });

  it("does not submit words shorter than 4 letters", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByLabelText(/word/i);
    fireEvent.change(input, { target: { value: "TES" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.queryByText("TES")).not.toBeInTheDocument();
  });
});
