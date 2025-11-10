import { describe, expect, it } from "vitest";
import { upsertSubmission, type UpsertOptions } from "@/lib/submissions/save";

type InsertPayload = {
  userId: string;
  date: string;
  words: string;
  score: number;
};

class FakeDatabase {
  stored: (InsertPayload & { id: number }) | null = null;

  insert() {
    return {
      values: (payload: InsertPayload) => {
        if (!this.stored) {
          this.stored = { ...payload, id: 1 };
        } else {
          this.stored = { ...this.stored, ...payload };
        }

        return {
          onConflictDoUpdate: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: this.stored!.id,
                  userId: this.stored!.userId,
                  date: this.stored!.date,
                  words: this.stored!.words,
                  score: this.stored!.score,
                },
              ]),
          }),
        };
      },
    };
  }
}

describe("upsertSubmission", () => {
  it("serializes words and returns stored submission", async () => {
    const fakeDb = new FakeDatabase();
    const stored = await upsertSubmission(
      { userId: "user-1", date: "2025-01-02", words: ["GAME"], score: 4 },
      { db: fakeDb as UpsertOptions["db"] },
    );

    expect(stored.id).toBe(1);
    expect(stored.words).toEqual(["GAME"]);
    expect(fakeDb.stored?.words).toBe('["GAME"]');
  });

  it("updates existing submission on conflict", async () => {
    const fakeDb = new FakeDatabase();

    await upsertSubmission(
      { userId: "user-1", date: "2025-01-02", words: ["GAME"], score: 4 },
      { db: fakeDb as UpsertOptions["db"] },
    );

    const updated = await upsertSubmission(
      { userId: "user-1", date: "2025-01-02", words: ["PUZZLE"], score: 10 },
      { db: fakeDb as UpsertOptions["db"] },
    );

    expect(updated.score).toBe(10);
    expect(updated.words).toEqual(["PUZZLE"]);
    expect(fakeDb.stored?.words).toBe('["PUZZLE"]');
  });
});
