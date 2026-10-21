import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cleanName, nameSuggestions } from '@/lib/names';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const firstName = cleanName(body.firstName);
  const lastName = cleanName(body.lastName);
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }

  const displayName = String(body.displayName ?? '');
  if (!nameSuggestions(firstName, lastName).includes(displayName)) {
    return NextResponse.json({ error: 'invalid_display_name' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .upsert({ id: user.id, full_name: `${firstName} ${lastName}`, display_name: displayName }, { onConflict: 'id' });
  if (error) {
    console.error('Could not save profile:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
