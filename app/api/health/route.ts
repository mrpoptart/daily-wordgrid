import { NextResponse } from "next/server";
import { pb } from "@/lib/pocketbase";

export type HealthResponse = {
  status: "ok";
  env: {
    hasPocketBaseUrl: boolean;
    pocketBaseHealth: boolean;
    vercelEnv: string | null;
    hasVercelUrl: boolean;
  };
};

export async function GET() {
  const hasPocketBaseUrl = Boolean(
    process.env.NEXT_PUBLIC_POCKETBASE_URL &&
      process.env.NEXT_PUBLIC_POCKETBASE_URL.trim()
  );

  let pocketBaseHealth = false;
  try {
      const health = await pb.health.check();
      if (health.code === 200) {
          pocketBaseHealth = true;
      }
  } catch (e) {
      console.error("PocketBase health check failed", e);
  }

  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const hasVercelUrl = Boolean(
    process.env.VERCEL_URL && process.env.VERCEL_URL.trim()
  );

  const body: HealthResponse = {
    status: "ok",
    env: {
      hasPocketBaseUrl,
      pocketBaseHealth,
      vercelEnv,
      hasVercelUrl,
    },
  };

  return NextResponse.json(body, { status: 200 });
}
