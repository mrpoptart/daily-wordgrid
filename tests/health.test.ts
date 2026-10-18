import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GET, HealthResponse } from '@/app/api/health/route';

const fetchMock = vi.fn();

describe('Health API', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reports ok when Firestore answers (a rules denial still proves reachability)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.env.firebaseProjectId).toBe('boggle-me');
    expect(json.env.firebaseHealth).toBe(true);
    expect(json.env.firebaseError).toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/projects/boggle-me/databases/(default)/documents/');
  });

  test('reports degraded status when Firestore returns a server error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('degraded');
    expect(json.env.firebaseHealth).toBe(false);
    expect(json.env.firebaseError).toBe('Firestore responded 503');

    consoleError.mockRestore();
  });

  test('reports degraded status with the network error when Firestore is unreachable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(
      new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND firestore.googleapis.com') }),
    );

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.status).toBe('degraded');
    expect(json.env.firebaseHealth).toBe(false);
    expect(json.env.firebaseError).toContain('fetch failed');
    expect(json.env.firebaseError).toContain('ENOTFOUND firestore.googleapis.com');

    consoleError.mockRestore();
  });
});
