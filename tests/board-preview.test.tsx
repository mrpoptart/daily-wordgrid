import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardPreview } from "@/components/landing/board-preview";

const SAMPLE_BOARD = [
  ["A", "B", "C", "D", "E"],
  ["F", "G", "H", "I", "J"],
  ["K", "L", "M", "N", "O"],
  ["P", "Q", "R", "S", "T"],
  ["U", "V", "W", "X", "Y"],
] as const;

describe("BoardPreview", () => {
  it("renders a 5x5 grid for the provided board", () => {
    render(<BoardPreview board={SAMPLE_BOARD} caption="Demo board" highlightPath={[]} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(25);
    expect(screen.getByText("Q")).toBeInTheDocument();
    expect(screen.getByText("Demo board")).toBeInTheDocument();
  });

  it("marks highlighted coordinates in the aria label", () => {
    render(
      <BoardPreview
        board={SAMPLE_BOARD}
        highlightPath={[
          [0, 0],
          [4, 4],
        ]}
      />,
    );
    const highlighted = screen.getAllByLabelText(/highlighted path/i);
    expect(highlighted).toHaveLength(2);
  });
});
