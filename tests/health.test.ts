import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET, HealthResponse } from '@/app/api/health/route';

const selectMock = vi.fn();

// Mock Supabase
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: (...args: unknown[]) => selectMock(...args),
    }),
  },
}));

describe('Health API', () => {
  const oldSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    selectMock.mockReset();
    selectMock.mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = oldSupabaseUrl;
  });

  test('returns status ok and environment flags', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.env.hasSupabaseUrl).toBe(true);
    expect(json.env.supabaseHost).toBe('example.supabase.co');
    expect(json.env.supabaseHealth).toBe(true);
    expect(json.env.supabaseError).toBeNull();
  });

  test('handles missing Supabase URL', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.env.hasSupabaseUrl).toBe(false);
    expect(json.env.supabaseHost).toBeNull();
  });

  test('reports degraded status with the Supabase error when the query fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    selectMock.mockResolvedValue({
      error: {
        message: 'TypeError: fetch failed',
        details: 'Caused by: Error: getaddrinfo ENOTFOUND example.supabase.co',
        hint: '',
        code: '',
      },
    });

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(json.status).toBe('degraded');
    expect(json.env.supabaseHealth).toBe(false);
    expect(json.env.supabaseError).toContain('fetch failed');
    expect(json.env.supabaseError).toContain('ENOTFOUND example.supabase.co');

    consoleError.mockRestore();
  });

  test('reports degraded status when the Supabase client throws', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    selectMock.mockRejectedValue(new Error('connection refused'));

    const response = await GET();
    const json = (await response.json()) as HealthResponse;

    expect(json.status).toBe('degraded');
    expect(json.env.supabaseHealth).toBe(false);
    expect(json.env.supabaseError).toBe('connection refused');

    consoleError.mockRestore();
  });
});
