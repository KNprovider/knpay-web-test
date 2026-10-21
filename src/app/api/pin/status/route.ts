import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { UNLOCK_COOKIE, unlockOptions } from '@/lib/unlock';

// Called right after a login (email code or Face ID / fingerprint).
// Tells the app whether a PIN exists and whether the app is now unlocked.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('user_pins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const hasPin = !!row;

  // Keep the routing flag in sync (covers PINs made before the flag existed)
  if (hasPin && (user.app_metadata as any)?.has_pin !== true) {
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { has_pin: true } });
  }

  // Only a login from the last 2 minutes may skip the PIN screen.
  // last_sign_in_at is set by Supabase and cannot be faked from the browser.
  const fresh =
    !!user.last_sign_in_at && Date.now() - new Date(user.last_sign_in_at).getTime() < 2 * 60 * 1000;
  const unlocked = hasPin && fresh;

  const res = NextResponse.json({ hasPin, unlocked });
  if (unlocked) res.cookies.set(UNLOCK_COOKIE, user.id, unlockOptions);

  return res;
}
