import { NextResponse } from 'next/server';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Looks up a phone number and returns ONLY the display name (never the full name).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = parsePhoneNumberFromString(String(body.phone ?? ''));
  if (!parsed || !parsed.isValid()) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('phone', parsed.number)
    .maybeSingle();

  if (!row || !row.display_name) {
    return NextResponse.json({ found: false });
  }
  if (row.id === user.id) {
    return NextResponse.json({ found: true, self: true });
  }

  return NextResponse.json({
    found: true,
    displayName: row.display_name,
    phone: parsed.number, // e.g. +4512345678
    phoneDisplay: parsed.formatInternational(), // e.g. +45 12 34 56 78
  });
}
