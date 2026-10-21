import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/pin';
import { UNLOCK_COOKIE, unlockOptions } from '@/lib/unlock';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: '' }));
  if (!/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('user_pins')
    .select('pin_hash, failed_attempts')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'no_pin' }, { status: 404 });

  if (await verifyPin(String(pin), row.pin_hash)) {
    await admin.from('user_pins').update({ failed_attempts: 0 }).eq('user_id', user.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(UNLOCK_COOKIE, user.id, unlockOptions);
    return res;
  }

  const attempts = row.failed_attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await admin.from('user_pins').update({ failed_attempts: 0 }).eq('user_id', user.id);
    await supabase.auth.signOut();
    const res = NextResponse.json({ error: 'logged_out' }, { status: 423 });
    res.cookies.delete(UNLOCK_COOKIE);
    return res;
  }

  await admin.from('user_pins').update({ failed_attempts: attempts }).eq('user_id', user.id);
  return NextResponse.json({ error: 'wrong_pin', remaining: MAX_ATTEMPTS - attempts }, { status: 401 });
}
