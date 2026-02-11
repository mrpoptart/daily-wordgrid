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

    // Start the game first
    fireEvent.click(screen.getByText("Start"));

    const input = screen.getByPlaceholderText(/enter word/i);
    await waitFor(() => expect(input).not.toBeDisabled());

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

    fireEvent.click(screen.getByText("Start"));

    const input = screen.getByPlaceholderText(/enter word/i);
    await waitFor(() => expect(input).not.toBeDisabled());

    fireEvent.change(input, { target: { value: "TEST" } });

    // T (0,0)
    const tiles = screen.getAllByText("T");
    const firstT = tiles[0];

    // Wait for highlight update
    await waitFor(() => {
        expect(firstT).toHaveClass("bg-emerald-500");
    });
  });

  it("does not submit invalid words and clears input", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    fireEvent.click(screen.getByText("Start"));

    const input = screen.getByPlaceholderText(/enter word/i) as HTMLInputElement;
    await waitFor(() => expect(input).not.toBeDisabled());

    fireEvent.change(input, { target: { value: "ZZZZ" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.queryByText("ZZZZ")).not.toBeInTheDocument();

    await waitFor(() => {
        expect(input.value).toBe("");
    });
  });

  it("clears input when word is on board but not in dictionary", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    fireEvent.click(screen.getByText("Start"));

    const input = screen.getByPlaceholderText(/enter word/i) as HTMLInputElement;
    await waitFor(() => expect(input).not.toBeDisabled());

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

    fireEvent.click(screen.getByText("Start"));

    const input = screen.getByPlaceholderText(/enter word/i);
    await waitFor(() => expect(input).not.toBeDisabled());

    fireEvent.change(input, { target: { value: "TES" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.queryByText("TES")).not.toBeInTheDocument();
  });
});
