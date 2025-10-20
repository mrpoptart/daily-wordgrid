import { NextResponse } from "next/server";

export type HealthResponse = {
  status: "ok";
  env: {
    hasSupabaseUrl: boolean;
    vercelEnv: string | null;
    hasVercelUrl: boolean;
  };
};

export async function GET() {
  const hasSupabaseUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
  );
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const hasVercelUrl = Boolean(
    process.env.VERCEL_URL && process.env.VERCEL_URL.trim()
  );

  const body: HealthResponse = {
    status: "ok",
    env: {
      hasSupabaseUrl,
      vercelEnv,
      hasVercelUrl,
    },
  };

  return NextResponse.json(body, { status: 200 });
}
