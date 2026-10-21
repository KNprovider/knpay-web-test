import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { makeSendProof, SEND_PROOF_COOKIE, SEND_PROOF_TTL_MS } from '@/lib/sendProof';

// Called right after the customer used Face ID / fingerprint on the send screen.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  // The Face ID / fingerprint login must have happened in the last minute.
  // last_sign_in_at is set by Supabase and cannot be faked from the browser.
  const fresh =
    !!user.last_sign_in_at && Date.now() - new Date(user.last_sign_in_at).getTime() < 60 * 1000;
  if (!fresh) return NextResponse.json({ error: 'not_fresh' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SEND_PROOF_COOKIE, await makeSendProof(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEND_PROOF_TTL_MS / 1000,
  });
  return res;
}
