import { describe, it, expect } from "vitest";
import { areAdjacent, type Coord } from "@/lib/validation/adjacency";

describe("areAdjacent (8-way)", () => {
  it("returns true for all eight neighbors and false otherwise", () => {
    const center: Coord = [2, 2];
    const neighbors: Coord[] = [
      [1, 1], [1, 2], [1, 3],
      [2, 1],         [2, 3],
      [3, 1], [3, 2], [3, 3],
    ];

    for (const n of neighbors) {
      expect(areAdjacent(center, n)).toBe(true);
    }

    // same cell is not adjacent
    expect(areAdjacent(center, center)).toBe(false);

    // non-neighbors
    expect(areAdjacent(center, [0, 2])).toBe(false); // two up
    expect(areAdjacent(center, [2, 4])).toBe(false); // two right
    expect(areAdjacent(center, [4, 4])).toBe(false); // far diagonal
  });
});
