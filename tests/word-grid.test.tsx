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

    const input = screen.getByPlaceholderText(/enter word/i);
    fireEvent.change(input, { target: { value: "TEST" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
        expect(screen.getByText("TEST")).toBeInTheDocument();
        expect(screen.getByText("(1 pts)")).toBeInTheDocument();
    });
  });

  it("highlights the board when typing a valid word", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByPlaceholderText(/enter word/i);
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

  it("does not submit invalid words and clears input", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByPlaceholderText(/enter word/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ZZZZ" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    // Should verify toast error or no word added
    // Toasts are hard to test with just screen.getByText depending on the library
    // But we can check that the word is NOT in the list
    expect(screen.queryByText("ZZZZ")).not.toBeInTheDocument();

    // Verify input is cleared (since ZZZZ is not on board or not in dictionary, both clear input now)
    await waitFor(() => {
        expect(input.value).toBe("");
    });
  });

  it("clears input when word is on board but not in dictionary", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    // "AAAA" is on the board (row 1, cols 0-3) but likely not in dictionary
    const input = screen.getByPlaceholderText(/enter word/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "AAAA" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.queryByText("AAAA")).not.toBeInTheDocument();

    await waitFor(() => {
        expect(input.value).toBe("");
    });
  });

  it("does not submit words shorter than 4 letters", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    const input = screen.getByPlaceholderText(/enter word/i);
    fireEvent.change(input, { target: { value: "TES" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.queryByText("TES")).not.toBeInTheDocument();
  });
});
