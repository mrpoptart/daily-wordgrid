import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TimeUpModal } from "@/components/play/minimal/TimeUpModal";
import { buildSegments } from "@/lib/segments";
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(cleanup);

const baseProps = {
  totalScore: 100,
  wordsFound: 5,
  timeLimit: 300,
  segments: buildSegments([], 300),
  onShare: () => {},
  onExtend: () => {},
  onDismiss: () => {},
};

describe("TimeUpModal", () => {
  it("does not render when not open", () => {
    render(<TimeUpModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText("Time's Up!")).toBeNull();
  });

  it("renders score, words, and time-played when open", () => {
    render(<TimeUpModal {...baseProps} isOpen={true} />);
    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("5:00")).toBeInTheDocument();
    expect(screen.getByText("+5 more minutes")).toBeInTheDocument();
    expect(screen.getByText("Share Score")).toBeInTheDocument();
  });

  it("calls onExtend when +5 more minutes is clicked", () => {
    const onExtend = vi.fn();
    render(<TimeUpModal {...baseProps} onExtend={onExtend} isOpen={true} />);
    fireEvent.click(screen.getByText("+5 more minutes"));
    expect(onExtend).toHaveBeenCalled();
  });

  it("calls onShare when Share Score is clicked", () => {
    const onShare = vi.fn();
    render(<TimeUpModal {...baseProps} onShare={onShare} isOpen={true} />);
    fireEvent.click(screen.getByText("Share Score"));
    expect(onShare).toHaveBeenCalled();
  });

  it("calls onDismiss when Close is clicked", () => {
    const onDismiss = vi.fn();
    render(<TimeUpModal {...baseProps} onDismiss={onDismiss} isOpen={true} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("shows per-segment breakdown once multiple segments exist", () => {
    const segments = buildSegments(
      [
        { word: "ALPHA", score: 2, elapsedAt: 10 },
        { word: "BETA", score: 1, elapsedAt: 310 },
      ],
      600
    );
    render(
      <TimeUpModal
        {...baseProps}
        timeLimit={600}
        segments={segments}
        totalScore={3}
        wordsFound={2}
        isOpen={true}
      />
    );
    expect(screen.getByText("0:00–5:00")).toBeInTheDocument();
    expect(screen.getByText("5:00–10:00")).toBeInTheDocument();
  });
});
