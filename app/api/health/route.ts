import { NextResponse } from 'next/server';
import { adminApp, adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/db-schema';

export const dynamic = 'force-dynamic';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  env: {
    hasFirebaseCredentials: boolean;
    firebaseProjectId: string;
    firebaseHealth: boolean;
    firebaseError: string | null;
    vercelEnv: string | null;
    hasVercelUrl: boolean;
  };
};

function describeError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const record = error as { message?: unknown; details?: unknown; cause?: unknown };
    const parts: string[] = [];
    if (typeof record.message === 'string') parts.push(record.message);
    // gRPC/REST errors may carry the underlying failure in `details`
    if (typeof record.details === 'string' && record.details !== record.message) {
      parts.push(record.details);
    }
    const cause = record.cause;
    if (cause instanceof Error && !parts.some((p) => p.includes(cause.message))) {
      parts.push(cause.message);
    }
    if (parts.length > 0) return parts.join(' | ');
  }
  return String(error);
}

export async function GET() {
  const hasFirebaseCredentials = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.FIRESTORE_EMULATOR_HOST?.trim()
  );
  const firebaseProjectId = adminApp.options.projectId ?? 'unknown';

  let firebaseHealth = false;
  let firebaseError: string | null = null;
  try {
    // Simple read to check connectivity and credentials.
    await adminDb.collection(COLLECTIONS.games).limit(1).get();
    firebaseHealth = true;
  } catch (e) {
    firebaseError = describeError(e);
  }

  if (firebaseError) {
    console.error('Firebase health check failed:', firebaseError);
  }

  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const hasVercelUrl = Boolean(process.env.VERCEL_URL && process.env.VERCEL_URL.trim());

  const body: HealthResponse = {
    status: firebaseHealth ? 'ok' : 'degraded',
    env: {
      hasFirebaseCredentials,
      firebaseProjectId,
      firebaseHealth,
      firebaseError,
      vercelEnv,
      hasVercelUrl,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
