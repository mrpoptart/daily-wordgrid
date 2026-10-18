// @vitest-environment node
//
// Runs against the Firebase emulators: `npm run test:emulator`.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { deleteApp, initializeApp as initClientApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  type Auth,
} from "firebase/auth";
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
import { dailyBoardDocId, wordDocId } from "@/lib/db-schema";

const runIf = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

const DATE = "2000-01-02"; // far from any real board date

runIf("firestore.rules", () => {
  let app: FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  let ALICE: string;
  let BOB: string;

  beforeAll(async () => {
    // Clear emulator users so the fixed test emails can be re-created
    await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/boggle-me/accounts`, {
      method: "DELETE",
    });

    app = initClientApp({ apiKey: "fake", projectId: "boggle-me" }, "rules-test");
    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    connectFirestoreEmulator(db, host, Number(port));

    // Bob signs up and saves a word, then Alice signs up and is the active user
    BOB = (await createUserWithEmailAndPassword(auth, "bob@example.com", "password123")).user.uid;
    await setDoc(doc(db, "words", wordDocId(BOB, DATE, "BOBS")), {
      id: "b1", user_id: BOB, word: "BOBS", score: 1, board_date: DATE, created_at: serverTimestamp(), elapsed_at: 3,
    });
    ALICE = (await createUserWithEmailAndPassword(auth, "alice@example.com", "password123")).user.uid;
  });

  afterAll(async () => {
    await signOut(auth);
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
    await denied(getDocs(query(collection(db, "users"))));
  });

  test("user can only write words under their own uid", async () => {
    const ref = doc(db, "words", wordDocId(ALICE, DATE, "TEST"));
    await setDoc(ref, word());
    await denied(setDoc(doc(db, "words", wordDocId(BOB, DATE, "TEST")), word({ user_id: BOB })));
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

  test("collections without rules are closed", async () => {
    await denied(getDoc(doc(db, "games", DATE)));
    await denied(setDoc(doc(db, "anything", "x"), { a: 1 }));
  });
});
