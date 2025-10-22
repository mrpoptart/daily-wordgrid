export type BoardCell = string; // single uppercase A–Z letter

export type BoardRow = [BoardCell, BoardCell, BoardCell, BoardCell, BoardCell];

export type Board = [BoardRow, BoardRow, BoardRow, BoardRow, BoardRow];

export function isBoard(value: unknown): value is Board {
  if (!Array.isArray(value) || value.length !== 5) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 5) return false;
    for (const cell of row) {
      if (typeof cell !== "string" || cell.length !== 1 || !/[A-Z]/.test(cell)) {
        return false;
      }
    }
  }
  return true;
}
