import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type HealthResponse = {
  status: "ok";
  env: {
    hasSupabaseUrl: boolean;
    supabaseHealth: boolean;
    vercelEnv: string | null;
    hasVercelUrl: boolean;
  };
};

export async function GET() {
  const hasSupabaseUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
  );

  let supabaseHealth = false;
  try {
      // Simple query to check connection
      // We check for count of games, or just head check if possible
      const { error } = await supabaseAdmin.from('games').select('date', { count: 'exact', head: true });
      if (!error) {
          supabaseHealth = true;
      }
  } catch (e) {
      console.error("Supabase health check failed", e);
  }

  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const hasVercelUrl = Boolean(
    process.env.VERCEL_URL && process.env.VERCEL_URL.trim()
  );

  const body: HealthResponse = {
    status: "ok",
    env: {
      hasSupabaseUrl,
      supabaseHealth,
      vercelEnv,
      hasVercelUrl,
    },
  };

  return NextResponse.json(body, { status: 200 });
}
