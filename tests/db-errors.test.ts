import { describe, expect, test } from "vitest";
import { describeDbError } from "@/lib/db-errors";

const firestoreError = (code: string, message: string) => Object.assign(new Error(message), { code, name: "FirebaseError" });

describe("describeDbError", () => {
  test("explains known Firestore codes and keeps the code", () => {
    expect(describeDbError(firestoreError("permission-denied", "Missing or insufficient permissions."))).toBe(
      "The database refused this request (security rules). [permission-denied]"
    );
    expect(describeDbError(firestoreError("unavailable", "Failed to get document because the client is offline."))).toBe(
      "Can't reach the database. Check your connection. [unavailable]"
    );
  });

  test("falls back to the raw message with the code for unknown codes", () => {
    expect(describeDbError(firestoreError("invalid-argument", "Function setDoc() called with invalid data."))).toBe(
      "Function setDoc() called with invalid data. [invalid-argument]"
    );
  });

  test("handles plain errors and non-errors", () => {
    expect(describeDbError(new Error("boom"))).toBe("boom");
    expect(describeDbError("weird")).toBe("weird");
    expect(describeDbError(null)).toBe("Unknown error");
  });
});
