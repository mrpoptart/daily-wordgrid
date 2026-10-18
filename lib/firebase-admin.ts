import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "boggle-me";

function createAdminApp(): App {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount && serviceAccount.trim()) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)), projectId: PROJECT_ID });
  }
  // Falls back to Application Default Credentials (or the emulator when
  // FIRESTORE_EMULATOR_HOST is set).
  return initializeApp({ projectId: PROJECT_ID });
}

// This client should only be used on the server side
export const adminApp = getApps().length ? getApp() : createAdminApp();
export const adminDb = getFirestore(adminApp);
