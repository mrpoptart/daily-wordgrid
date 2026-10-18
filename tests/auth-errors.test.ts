import { describe, expect, test } from 'vitest';
import { BACKEND_UNREACHABLE_MESSAGE, describeAuthError, isAuthCancellation } from '@/lib/auth-errors';

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

  test('maps Firebase network errors to the outage message', () => {
    const error = Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), {
      code: 'auth/network-request-failed',
    });
    expect(describeAuthError(error, 'fallback')).toBe(BACKEND_UNREACHABLE_MESSAGE);
  });

  test('maps known Firebase auth codes to friendly messages', () => {
    const error = Object.assign(new Error('Firebase: Error (auth/invalid-email).'), {
      code: 'auth/invalid-email',
    });
    expect(describeAuthError(error, 'fallback')).toBe("That email address doesn't look right.");
  });

  test('uses the fallback for unknown Firebase auth codes', () => {
    const error = Object.assign(new Error('Firebase: Error (auth/internal-error).'), {
      code: 'auth/internal-error',
    });
    expect(describeAuthError(error, 'fallback')).toBe('fallback');
  });

  test('detects a dismissed Google popup', () => {
    expect(isAuthCancellation({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isAuthCancellation({ code: 'auth/invalid-email' })).toBe(false);
    expect(isAuthCancellation(null)).toBe(false);
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
