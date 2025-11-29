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

// Helper to simulate global typing
function typeWord(word: string) {
  for (const char of word) {
    fireEvent.keyDown(window, { key: char });
  }
}

describe("WordGrid", () => {
  it("allows typing a word via virtual keyboard and submitting", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    // Click letters on virtual keyboard
    fireEvent.click(screen.getByRole("button", { name: "T" }));
    fireEvent.click(screen.getByRole("button", { name: "E" }));
    fireEvent.click(screen.getByRole("button", { name: "S" }));
    fireEvent.click(screen.getByRole("button", { name: "T" }));

    // Click submit on virtual keyboard (ENTER) or the Submit button
    const submitButton = screen.getByRole("button", { name: "Submit" }); // The separate button
    fireEvent.click(submitButton);

    await waitFor(() => {
        // We look for the found word in the list (FoundWords component)
        // Since "TEST" is also on the keyboard, we need to be specific.
        // Found words are usually in a list.
        const foundWord = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && content === 'TEST';
        });
        expect(foundWord).toBeInTheDocument();
        expect(screen.getByText("(1 pts)")).toBeInTheDocument();
    });
  });

  it("allows typing a word via global keyboard and submitting", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    typeWord("TEST");

    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => {
         const foundWord = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && content === 'TEST';
        });
        expect(foundWord).toBeInTheDocument();
    });
  });

  it("highlights the board when typing a valid word", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    typeWord("TEST");

    // T (0,0)
    // There are multiple "T"s now (board + keyboard).
    // Board tiles have specific class or structure.
    // The keyboard buttons are buttons. The board tiles are divs.

    // Board tiles are in a container with grid-cols-5.
    // Let's rely on the fact that board tiles have the class 'aspect-square'.
    // Or we can scope it.

    // Actually, `getAllByText("T")` will return all.
    // We can filter by those that are NOT buttons.
    const tiles = screen.getAllByText("T").filter(el => el.tagName !== 'BUTTON');
    const firstT = tiles[0];

    // Wait for highlight update
    await waitFor(() => {
        expect(firstT).toHaveClass("bg-[#3A7AFE]");
    });
  });

  it("does not submit invalid words and clears input", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    typeWord("ZZZZ");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    // Should verify toast error or no word added
    expect(screen.queryByText((content, el) => el?.tagName === 'SPAN' && content === "ZZZZ")).not.toBeInTheDocument();

    // Verify input is cleared.
    // The input display is a div with text content.
    // We can look for "Type or click letters..." placeholder if empty.
    await waitFor(() => {
        expect(screen.getByText("Type or click letters...")).toBeInTheDocument();
    });
  });

  it("clears input when word is on board but not in dictionary", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    typeWord("AAAA");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.queryByText((content, el) => el?.tagName === 'SPAN' && content === "AAAA")).not.toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByText("Type or click letters...")).toBeInTheDocument();
    });
  });

  it("does not submit words shorter than 4 letters", async () => {
    render(<WordGrid board={testBoard} boardDate="2024-01-01" />);

    typeWord("TES");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.queryByText((content, el) => el?.tagName === 'SPAN' && content === "TES")).not.toBeInTheDocument();
  });
});
