"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Passkeys (Face ID / fingerprint / Windows Hello) are experimental in
      // Supabase and must be switched on explicitly.
      auth: { experimental: { passkey: true } },
    } as any
  );
}
