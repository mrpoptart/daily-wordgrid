import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET, HealthResponse } from '@/app/api/health/route';

const getMock = vi.fn();

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  adminApp: { options: { projectId: 'boggle-me' } },
  adminDb: {
    collection: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ get: (...args: unknown[]) => getMock(...args) }),
    }),
  },
}));

describe('Health API', () => {
  const oldServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ empty: true });
    process.env.FIREBASE_SERVICE_ACCOUNT = oldServiceAccount;
  });

  test('returns status ok and environment flags', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = '{"project_id":"boggle-me"}';

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.env.hasFirebaseCredentials).toBe(true);
    expect(json.env.firebaseProjectId).toBe('boggle-me');
    expect(json.env.firebaseHealth).toBe(true);
    expect(json.env.firebaseError).toBeNull();
  });

  test('handles missing Firebase credentials', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.env.hasFirebaseCredentials).toBe(false);
  });

  test('reports degraded status with the Firestore error when the query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMock.mockRejectedValue(
      Object.assign(new Error('14 UNAVAILABLE: No connection established'), {
        details: 'getaddrinfo ENOTFOUND firestore.googleapis.com',
      }),
    );

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('degraded');
    expect(json.env.firebaseHealth).toBe(false);
    expect(json.env.firebaseError).toContain('UNAVAILABLE');
    expect(json.env.firebaseError).toContain('ENOTFOUND firestore.googleapis.com');

    consoleError.mockRestore();
  });

  test('reports degraded status when credentials are rejected', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMock.mockRejectedValue(new Error('7 PERMISSION_DENIED: Missing or insufficient permissions.'));

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.status).toBe('degraded');
    expect(json.env.firebaseHealth).toBe(false);
    expect(json.env.firebaseError).toBe('7 PERMISSION_DENIED: Missing or insufficient permissions.');

    consoleError.mockRestore();
  });
});
