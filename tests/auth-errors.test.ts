import { describe, expect, test } from 'vitest';
import { BACKEND_UNREACHABLE_MESSAGE, describeAuthError } from '@/lib/auth-errors';

describe('describeAuthError', () => {
  test('maps generic fetch failures to the outage message', () => {
    expect(describeAuthError(new TypeError('fetch failed'), 'fallback')).toBe(
      BACKEND_UNREACHABLE_MESSAGE,
    );
    expect(describeAuthError(new TypeError('Failed to fetch'), 'fallback')).toBe(
      BACKEND_UNREACHABLE_MESSAGE,
    );
    expect(describeAuthError(new TypeError('Load failed'), 'fallback')).toBe(
      BACKEND_UNREACHABLE_MESSAGE,
    );
  });

  test('maps supabase retryable fetch errors to the outage message', () => {
    const error = Object.assign(new Error('Network request failed'), {
      name: 'AuthRetryableFetchError',
      status: 0,
    });
    expect(describeAuthError(error, 'fallback')).toBe(BACKEND_UNREACHABLE_MESSAGE);
  });

  test('passes through real auth error messages', () => {
    expect(describeAuthError(new Error('Email rate limit exceeded'), 'fallback')).toBe(
      'Email rate limit exceeded',
    );
  });

  test('uses the fallback for non-error values', () => {
    expect(describeAuthError('boom', 'fallback')).toBe('fallback');
    expect(describeAuthError(null, 'fallback')).toBe('fallback');
    expect(describeAuthError(new Error('   '), 'fallback')).toBe('fallback');
  });
});
