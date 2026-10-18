import type { Timestamp } from "firebase-admin/firestore";

type Row = Record<string, unknown>;
export function toTimestamp(value: unknown): Timestamp | null;
export function toAuthImportRecord(user: Row): {
  uid: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  metadata: { creationTime?: string; lastSignInTime?: string };
  providerData: { uid: string; providerId: string; email?: string; displayName?: string; photoURL?: string }[];
};
export function toUserDoc(row: Row): Record<string, unknown>;
export function toWordDoc(row: Row): Record<string, unknown>;
export function toDailyBoardDoc(row: Row): Record<string, unknown>;
export function wordDocId(row: Row): string;
export function dailyBoardDocId(row: Row): string;
