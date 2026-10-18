// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  toAuthImportRecord,
  toDailyBoardDoc,
  toTimestamp,
  toUserDoc,
  toWordDoc,
  wordDocId,
} from "@/scripts/migrate-supabase-to-firebase.mjs";

describe("Supabase → Firebase transforms", () => {
  test("keeps microsecond precision on timestamptz values", () => {
    const ts = toTimestamp("2025-11-19T22:07:46.006912+00:00")!;
    expect(ts.seconds).toBe(Date.parse("2025-11-19T22:07:46Z") / 1000);
    expect(ts.nanoseconds).toBe(6912000);
    expect(toTimestamp("2025-11-19 22:07:46+00")!.seconds).toBe(Date.parse("2025-11-19T22:07:46Z") / 1000);
    expect(toTimestamp("2025-11-19T22:07:46.5Z")!.nanoseconds).toBe(500000000);
    expect(toTimestamp(null)).toBeNull();
  });

  test("maps a Google user to an import record with the Supabase id as uid", () => {
    const record = toAuthImportRecord({
      id: "uuid-1",
      email: "a@gmail.com",
      email_confirmed_at: "2025-11-19T22:07:46Z",
      created_at: "2025-11-19T22:07:46Z",
      last_sign_in_at: "2026-09-18T13:40:17Z",
      user_metadata: { full_name: "A B", avatar_url: "https://x/pic" },
      identities: [
        { provider: "email", provider_id: "uuid-1", identity_data: { email: "a@gmail.com" } },
        { provider: "google", provider_id: "1234567890", identity_data: { sub: "1234567890", email: "a@gmail.com", full_name: "A B" } },
      ],
    });
    expect(record).toMatchObject({
      uid: "uuid-1",
      email: "a@gmail.com",
      emailVerified: true,
      displayName: "A B",
      photoURL: "https://x/pic",
      providerData: [{ uid: "1234567890", providerId: "google.com", email: "a@gmail.com" }],
    });
    expect(record.metadata.creationTime).toBe("Wed, 19 Nov 2025 22:07:46 GMT");
  });

  test("maps a magic-link-only user without provider data", () => {
    const record = toAuthImportRecord({
      id: "uuid-2", email: "b@example.com", email_confirmed_at: "2026-05-04T00:07:50Z",
      created_at: "2026-05-04T00:07:50Z", last_sign_in_at: null, user_metadata: {},
      identities: [{ provider: "email", provider_id: "uuid-2", identity_data: {} }],
    });
    expect(record).toEqual({
      uid: "uuid-2", email: "b@example.com", emailVerified: true,
      metadata: { creationTime: "Mon, 04 May 2026 00:07:50 GMT" }, providerData: [],
    });
  });

  test("maps table rows with identical field names and types", () => {
    const wordRow = { id: "w", user_id: "u", word: "TEST", score: 1, board_date: "2026-01-02", created_at: "2026-01-02T03:04:05.123456+00:00", elapsed_at: null };
    expect(wordDocId(wordRow)).toBe("u_2026-01-02_TEST");
    const wordDoc = toWordDoc(wordRow);
    expect(Object.keys(wordDoc).sort()).toEqual(Object.keys(wordRow).sort());
    expect(wordDoc.elapsed_at).toBeNull();

    expect(toDailyBoardDoc({ user_id: "u", board_date: "2026-01-02", board_started: "2026-01-02T03:04:05+00:00", elapsed_seconds: 301, time_limit_seconds: 600 }))
      .toMatchObject({ user_id: "u", board_date: "2026-01-02", elapsed_seconds: 301, time_limit_seconds: 600 });

    expect(toUserDoc({ id: "u", email: null, full_name: null, created_at: "2026-01-02T03:04:05+00:00", last_login: null }))
      .toMatchObject({ id: "u", email: null, full_name: null, last_login: null });
  });
});
