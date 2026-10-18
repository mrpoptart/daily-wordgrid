import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase-config";

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Local development / e2e tests against `firebase emulators:start`.
const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";
const globalFlags = globalThis as { __firebaseEmulatorsConnected?: boolean };
if (useEmulator && !globalFlags.__firebaseEmulatorsConnected) {
  globalFlags.__firebaseEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

if (typeof window !== "undefined" && !useEmulator) {
  import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(firebaseApp);
    })
    .catch(() => {});
}

export const EMAIL_FOR_SIGN_IN_KEY = "wordgrid-email-for-sign-in";

let emailLinkCompletion: Promise<void> | null = null;

/** Finishes a magic-link sign-in when the current URL is a Firebase email link. */
function completeEmailLinkSignIn(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (emailLinkCompletion) return emailLinkCompletion;

  emailLinkCompletion = (async () => {
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) return;
    await auth.authStateReady();

    let email: string | null = null;
    try {
      email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
    } catch {
      // storage unavailable
    }
    // Link opened on a different device/browser than the one that requested it
    if (!email) email = window.prompt("Please confirm your email to finish signing in");
    if (!email) return;

    try {
      await signInWithEmailLink(auth, email, href);
      try {
        window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
      } catch {
        // storage unavailable
      }
      // Strip the one-time sign-in params from the address bar
      const url = new URL(href);
      ["apiKey", "oobCode", "mode", "lang", "continueUrl", "tenantId"].forEach((key) =>
        url.searchParams.delete(key)
      );
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (error) {
      console.error("Failed to complete email link sign-in:", error);
    }
  })();
  return emailLinkCompletion;
}

/** Resolves the signed-in user once Firebase has restored any persisted session. */
export async function getCurrentUser(): Promise<User | null> {
  await completeEmailLinkSignIn();
  await auth.authStateReady();
  return auth.currentUser;
}
