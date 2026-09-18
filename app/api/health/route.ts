import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  env: {
    hasSupabaseUrl: boolean;
    supabaseHost: string | null;
    supabaseHealth: boolean;
    supabaseError: string | null;
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
    // supabase-js wraps the underlying fetch failure (e.g. DNS ENOTFOUND) in `details`
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

function resolveSupabaseHost(url: string | undefined): string | null {
  if (!url || !url.trim()) return null;
  try {
    return new URL(url.trim()).host;
  } catch {
    return url.trim();
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseUrl = Boolean(supabaseUrl && supabaseUrl.trim());
  const supabaseHost = resolveSupabaseHost(supabaseUrl);

  let supabaseHealth = false;
  let supabaseError: string | null = null;
  try {
    // Simple query to check connection. Also serves as the keepalive ping that
    // stops a free-tier Supabase project from being auto-paused for inactivity.
    const { error } = await supabaseAdmin
      .from('games')
      .select('date', { count: 'exact', head: true });
    if (!error) {
      supabaseHealth = true;
    } else {
      supabaseError = describeError(error);
    }
  } catch (e) {
    supabaseError = describeError(e);
  }

  if (supabaseError) {
    console.error('Supabase health check failed:', supabaseError);
  }

  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const hasVercelUrl = Boolean(process.env.VERCEL_URL && process.env.VERCEL_URL.trim());

  const body: HealthResponse = {
    status: supabaseHealth ? 'ok' : 'degraded',
    env: {
      hasSupabaseUrl,
      supabaseHost,
      supabaseHealth,
      supabaseError,
      vercelEnv,
      hasVercelUrl,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
