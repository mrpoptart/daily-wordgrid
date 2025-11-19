const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url: SUPABASE_URL.replace(/\/$/, ""), anonKey: SUPABASE_ANON_KEY };
}

export type MagicLinkResult = {
  success: boolean;
  message: string;
};

export type SendMagicLinkParams = {
  email: string;
  redirectTo?: string;
};

export async function sendSupabaseMagicLink({ email, redirectTo }: SendMagicLinkParams): Promise<MagicLinkResult> {
  const { url, anonKey } = ensureEnv();
  const response = await fetch(`${url}/auth/v1/magiclink`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      email,
      create_user: true,
      redirect_to: redirectTo,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Unable to start Supabase login. Please try again.");
  }

  return {
    success: true,
    message: "Check your email for the login link.",
  };
}
