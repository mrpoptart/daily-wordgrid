import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { WordGrid } from "@/components/play/word-grid";
import type { Board } from "@/lib/board/types";

afterEach(cleanup);

const testBoard: Board = [
  ["T", "E", "S", "T", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
];

const heatBoard: Board = [
  ["H", "E", "A", "T", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
  ["A", "A", "A", "A", "A"],
];

describe("WordGrid", () => {
  it("lets players tap adjacent letters to add a word", async () => {
    render(<WordGrid board={testBoard} />);

    const [first, second, third, fourth] = screen.getAllByRole("button", {
      name: /row 1, column [1-4]:/i,
    });

    fireEvent.pointerDown(first);
    fireEvent.pointerEnter(second);
    fireEvent.pointerEnter(third);
    fireEvent.pointerEnter(fourth);
    fireEvent.pointerUp(fourth);

    fireEvent.click(fourth);
    expect(screen.queryByRole("listitem")).toBeNull();

    fireEvent.click(fourth);

    const statuses = await screen.findAllByRole("status");
    expect(statuses.at(-1)).toHaveTextContent(/added test/i);
    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("TEST");
    expect(listItem).toHaveTextContent(/\+1 pts/i);
  });

  it("supports dragging to select a path", () => {
    render(<WordGrid board={testBoard} />);

    const first = screen.getAllByRole("button", { name: /row 1, column 1: t/i })[0];
    const second = screen.getAllByRole("button", { name: /row 1, column 2: e/i })[0];
    const third = screen.getAllByRole("button", { name: /row 1, column 3: s/i })[0];

    fireEvent.pointerDown(first);
    fireEvent.pointerEnter(second);
    fireEvent.pointerEnter(third);
    fireEvent.pointerUp(third);

    expect(first).toHaveAttribute("aria-label", expect.stringMatching(/selected/i));
    expect(second).toHaveAttribute("aria-label", expect.stringMatching(/selected/i));
    expect(third).toHaveAttribute("aria-label", expect.stringMatching(/selected/i));
  });

  it("taps the last letter twice to submit and clear the selection", async () => {
    render(<WordGrid board={testBoard} />);

    const first = screen.getAllByRole("button", { name: /row 1, column 1: t/i })[0];
    const second = screen.getAllByRole("button", { name: /row 1, column 2: e/i })[0];
    const third = screen.getAllByRole("button", { name: /row 1, column 3: s/i })[0];
    const lastLetter = screen.getAllByRole("button", { name: /row 1, column 4: t/i })[0];

    fireEvent.pointerDown(first);
    fireEvent.pointerUp(first);
    fireEvent.pointerDown(second);
    fireEvent.pointerUp(second);
    fireEvent.pointerDown(third);
    fireEvent.pointerUp(third);
    fireEvent.pointerDown(lastLetter);
    fireEvent.pointerUp(lastLetter);

    fireEvent.click(lastLetter);
    fireEvent.click(lastLetter);

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("TEST");

    await waitFor(() => {
      const refreshed = screen.getAllByRole("button", { name: /row 1, column 4: t/i })[0];
      expect(refreshed).not.toHaveAttribute(
        "aria-label",
        expect.stringMatching(/selected/i),
      );
    });
  });

  it("requires tapping the last letter twice before submitting", async () => {
    render(<WordGrid board={testBoard} />);

    const first = screen.getAllByRole("button", { name: /row 1, column 1: t/i })[0];
    const second = screen.getAllByRole("button", { name: /row 1, column 2: e/i })[0];
    const third = screen.getAllByRole("button", { name: /row 1, column 3: s/i })[0];
    const lastLetter = screen.getAllByRole("button", { name: /row 1, column 4: t/i })[0];

    fireEvent.pointerDown(first);
    fireEvent.pointerUp(first);
    fireEvent.pointerDown(second);
    fireEvent.pointerUp(second);
    fireEvent.pointerDown(third);
    fireEvent.pointerUp(third);
    fireEvent.pointerDown(lastLetter);
    fireEvent.pointerUp(lastLetter);

    fireEvent.click(lastLetter);

    expect(screen.queryByRole("listitem")).toBeNull();

    fireEvent.click(lastLetter);

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("TEST");
  });

  it("only submits after a second tap on the final tile during tap flows", async () => {
    render(<WordGrid board={heatBoard} />);

    const first = screen.getAllByRole("button", { name: /row 1, column 1: h/i })[0];
    const second = screen.getAllByRole("button", { name: /row 1, column 2: e/i })[0];
    const third = screen.getAllByRole("button", { name: /row 1, column 3: a/i })[0];
    const lastLetter = screen.getAllByRole("button", { name: /row 1, column 4: t/i })[0];

    fireEvent.pointerDown(first);
    fireEvent.pointerUp(first);
    fireEvent.pointerDown(second);
    fireEvent.pointerUp(second);
    fireEvent.pointerDown(third);
    fireEvent.pointerUp(third);
    fireEvent.pointerDown(lastLetter);
    fireEvent.pointerUp(lastLetter);

    fireEvent.click(lastLetter);

    expect(screen.queryByRole("listitem")).toBeNull();

    fireEvent.click(lastLetter);

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("HEAT");
  });

  it("allows the add button to submit after arming the last tile", async () => {
    render(<WordGrid board={heatBoard} />);

    const first = screen.getAllByRole("button", { name: /row 1, column 1: h/i })[0];
    const second = screen.getAllByRole("button", { name: /row 1, column 2: e/i })[0];
    const third = screen.getAllByRole("button", { name: /row 1, column 3: a/i })[0];
    const lastLetter = screen.getAllByRole("button", { name: /row 1, column 4: t/i })[0];

    fireEvent.pointerDown(first);
    fireEvent.pointerUp(first);
    fireEvent.pointerDown(second);
    fireEvent.pointerUp(second);
    fireEvent.pointerDown(third);
    fireEvent.pointerUp(third);
    fireEvent.pointerDown(lastLetter);
    fireEvent.pointerUp(lastLetter);

    fireEvent.click(lastLetter);

    expect(screen.queryByRole("listitem")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /add word/i }));

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("HEAT");
  });

  it("highlights a matching path while typing and submits on enter", async () => {
    render(<WordGrid board={testBoard} />);

    const input = screen.getByLabelText(/type a word/i);

    fireEvent.change(input, { target: { value: "TEST" } });

    await waitFor(() => {
      const firstTile = screen.getAllByRole("button", { name: /row 1, column 1: t/i })[0];
      expect(firstTile).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/selected/i),
      );
    });

    const form = input.closest("form");
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    const listItem = await screen.findByRole("listitem");
    expect(listItem).toHaveTextContent("TEST");
  });

  it("shows errors when the typed word cannot be formed", async () => {
    render(<WordGrid board={testBoard} />);

    const input = screen.getByLabelText(/type a word/i);

    fireEvent.change(input, { target: { value: "ZZZZ" } });

    expect(screen.getByRole("status")).toHaveTextContent(
      /no valid path for that sequence/i,
    );

    const form = input.closest("form");
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /no valid path for that word on this board/i,
      );
    });
  });
});
