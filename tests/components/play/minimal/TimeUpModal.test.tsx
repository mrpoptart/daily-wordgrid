import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TimeUpModal } from "@/components/play/minimal/TimeUpModal";
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(cleanup);

describe("TimeUpModal", () => {
  it("does not render when not open", () => {
    render(
      <TimeUpModal
        score={10}
        wordsFound={5}
        onShare={() => {}}
        onKeepPlaying={() => {}}
        isOpen={false}
      />
    );
    expect(screen.queryByText("Time's Up!")).toBeNull();
  });

  it("renders correctly when open", () => {
    render(
      <TimeUpModal
        score={100}
        wordsFound={5}
        onShare={() => {}}
        onKeepPlaying={() => {}}
        isOpen={true}
      />
    );
    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // Score
    expect(screen.getByText("5")).toBeInTheDocument(); // Words
    expect(screen.getByText("Share Score")).toBeInTheDocument();
    expect(screen.getByText("Keep Playing")).toBeInTheDocument();
  });

  it("calls onShare when Share button is clicked", () => {
    const handleShare = vi.fn();
    render(
      <TimeUpModal
        score={10}
        wordsFound={5}
        onShare={handleShare}
        onKeepPlaying={() => {}}
        isOpen={true}
      />
    );
    fireEvent.click(screen.getByText("Share Score"));
    expect(handleShare).toHaveBeenCalled();
  });

  it("calls onKeepPlaying when Keep Playing button is clicked", () => {
    const handleKeepPlaying = vi.fn();
    render(
      <TimeUpModal
        score={10}
        wordsFound={5}
        onShare={() => {}}
        onKeepPlaying={handleKeepPlaying}
        isOpen={true}
      />
    );
    fireEvent.click(screen.getByText("Keep Playing"));
    expect(handleKeepPlaying).toHaveBeenCalled();
  });
});
