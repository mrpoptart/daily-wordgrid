import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { WordGrid } from "@/components/play/word-grid";
import type { Board } from "@/lib/board/types";

const testBoard: Board = [
  ["T", "E", "S", "T", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
];

describe("WordGrid", () => {
  it("lets players tap adjacent letters to add a word", async () => {
    render(<WordGrid board={testBoard} />);

    fireEvent.click(screen.getByRole("button", { name: /row 1, column 1: t/i }));
    fireEvent.click(screen.getByRole("button", { name: /row 1, column 2: e/i }));
    fireEvent.click(screen.getByRole("button", { name: /row 1, column 3: s/i }));
    fireEvent.click(screen.getByRole("button", { name: /row 1, column 4: t/i }));

    fireEvent.click(screen.getByRole("button", { name: /add word/i }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/added test/i);
    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("TEST");
    expect(listItem).toHaveTextContent(/\+1 pts/i);
  });
});
