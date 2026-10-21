import { NextResponse } from 'next/server';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  // No SMS check any more: the customer is responsible for their own number.
  // We still make sure it is a valid number and store it in one standard format.
  const body = await req.json().catch(() => ({}));
  const parsed = parsePhoneNumberFromString(String(body.phone ?? ''));
  if (!parsed || !parsed.isValid()) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  const phone = parsed.number; // e.g. +4512345678

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.full_name || !profile?.display_name) {
    return NextResponse.json({ error: 'profile_missing' }, { status: 400 });
  }

  const { error } = await admin.from('profiles').update({ phone }).eq('id', user.id);
  if (error) {
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'phone_taken' }, { status: 409 });
    }
    console.error('Could not save phone:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const { error: flagError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { onboarded: true },
  });
  if (flagError) {
    console.error('Could not set onboarded flag:', flagError);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
