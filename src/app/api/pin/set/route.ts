import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/pin';
import { UNLOCK_COOKIE, unlockOptions } from '@/lib/unlock';

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: '' }));
  if (!/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const admin = createAdminClient();

  // An existing PIN can only be replaced when the app is already unlocked
  const { data: existing } = await admin
    .from('user_pins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const unlocked = (await cookies()).get(UNLOCK_COOKIE)?.value === user.id;

  if (existing && !unlocked) {
    // A PIN already exists: make sure the routing flag is set, then the app sends the user to the PIN screen
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { has_pin: true } });
    return NextResponse.json({ error: 'locked' }, { status: 403 });
  }

  const { error } = await admin.from('user_pins').upsert({
    user_id: user.id,
    pin_hash: await hashPin(String(pin)),
    failed_attempts: 0,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  // Mark the customer as "has a PIN" so the app asks for it from now on
  const { error: flagError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { has_pin: true },
  });
  if (flagError) {
    console.error('Could not set has_pin flag:', flagError);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(UNLOCK_COOKIE, user.id, unlockOptions);
  return res;
}
