// @vitest-environment node
//
// Runs against the Firebase emulators: `npm run test:emulator`.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { deleteApp, initializeApp as initClientApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { getApps, initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { dailyBoardDocId, wordDocId } from "@/lib/db-schema";

const runIf = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const DATE = "2000-01-02"; // far from any real board date

runIf("firestore.rules", () => {
  let app: FirebaseApp;
  let db: Firestore;

  beforeAll(async () => {
    const admin = getApps()[0] ?? initAdminApp({ projectId: "boggle-me" });
    const adminAuth = getAdminAuth(admin);
    for (const [uid, email] of [[ALICE, "alice@example.com"], [BOB, "bob@example.com"]]) {
      await adminAuth.deleteUser(uid).catch(() => {});
      await adminAuth.createUser({ uid, email, password: "password123" });
    }
    const adminDb = getAdminFirestore(admin);
    await adminDb.doc(`words/${wordDocId(BOB, DATE, "BOBS")}`).set({
      id: "x", user_id: BOB, word: "BOBS", score: 1, board_date: DATE, created_at: new Date(), elapsed_at: 3,
    });
    await adminDb.doc(`board_word_counts/${DATE}`).set({ board_date: DATE, total_words: 1 });
    await adminDb.doc(`games/${DATE}`).set({ date: DATE, letters: "A".repeat(25), seed: "s" });

    app = initClientApp({ apiKey: "fake", projectId: "boggle-me" }, "rules-test");
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    connectFirestoreEmulator(db, host, Number(port));
    await signInWithEmailAndPassword(auth, "alice@example.com", "password123");
  });

  afterAll(async () => {
    await signOut(getAuth(app));
    await deleteApp(app);
  });

  const denied = (operation: Promise<unknown>) =>
    expect(operation).rejects.toMatchObject({ code: "permission-denied" });

  const word = (overrides: Record<string, unknown> = {}) => ({
    id: "w1", user_id: ALICE, word: "TEST", score: 1, board_date: DATE,
    created_at: serverTimestamp(), elapsed_at: 10, ...overrides,
  });

  test("user can create and update their own profile but not another's", async () => {
    await setDoc(doc(db, "users", ALICE), { id: ALICE, email: "alice@example.com", full_name: null, created_at: serverTimestamp(), last_login: serverTimestamp() });
    await setDoc(doc(db, "users", ALICE), { last_login: serverTimestamp() }, { merge: true });
    expect((await getDoc(doc(db, "users", ALICE))).exists()).toBe(true);
    await denied(setDoc(doc(db, "users", BOB), { id: BOB }));
    await denied(getDoc(doc(db, "users", BOB)));
    await denied(setDoc(doc(db, "users", ALICE), { id: BOB }, { merge: true }));
    await denied(getDocs(query(collection(db, "users"))));
  });

  test("user can insert a word once (unique constraint) and only for themselves", async () => {
    const ref = doc(db, "words", wordDocId(ALICE, DATE, "TEST"));
    await setDoc(ref, word());
    await denied(setDoc(ref, word({ score: 99 })));
    await denied(setDoc(doc(db, "words", wordDocId(BOB, DATE, "TEST")), word({ user_id: BOB })));
    // Doc id must match the row
    await denied(setDoc(doc(db, "words", wordDocId(ALICE, DATE, "OTHER")), word({ word: "TEST2" })));
  });

  test("user can only query their own words", async () => {
    const mine = await getDocs(
      query(collection(db, "words"), where("user_id", "==", ALICE), where("board_date", "==", DATE))
    );
    expect(mine.docs.map((d) => d.data().word)).toEqual(["TEST"]);
    await denied(getDocs(query(collection(db, "words"), where("user_id", "==", BOB))));
    await denied(getDocs(collection(db, "words")));
  });

  test("reading a not-yet-created own doc returns empty rather than an error", async () => {
    expect((await getDoc(doc(db, "daily_boards", dailyBoardDocId(ALICE, "2000-01-01")))).exists()).toBe(false);
    expect((await getDoc(doc(db, "words", wordDocId(ALICE, "2000-01-01", "NONE")))).exists()).toBe(false);
    // Other users' words stay hidden once they exist
    await denied(getDoc(doc(db, "words", wordDocId(BOB, DATE, "BOBS"))));
  });

  test("daily_boards: create, update elapsed/time limit, no hijacking", async () => {
    const ref = doc(db, "daily_boards", dailyBoardDocId(ALICE, DATE));
    await setDoc(ref, { user_id: ALICE, board_date: DATE, board_started: serverTimestamp(), elapsed_seconds: 0, time_limit_seconds: 300 });
    await updateDoc(ref, { elapsed_seconds: 120 });
    await updateDoc(ref, { time_limit_seconds: 600 });
    await denied(updateDoc(ref, { user_id: BOB }));
    const snap = await getDoc(ref);
    expect(snap.data()).toMatchObject({ elapsed_seconds: 120, time_limit_seconds: 600 });
    const all = await getDocs(query(collection(db, "daily_boards"), where("user_id", "==", ALICE)));
    expect(all.size).toBe(1);
  });

  test("board_word_counts is public; games and submissions are server-only", async () => {
    expect((await getDoc(doc(db, "board_word_counts", DATE))).exists()).toBe(true);
    await denied(setDoc(doc(db, "board_word_counts", DATE), { total_words: 0 }));
    await denied(getDoc(doc(db, "games", DATE)));
    await denied(getDocs(collection(db, "submissions")));
  });
});
