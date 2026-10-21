import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Modtag data fra Gembas webhook
    const { transfer_id, status } = body;

    if (!transfer_id || !status) {
      return NextResponse.json({ success: false, error: 'Ugyldig webhook payload' }, { status: 400 });
    }

    // Opret sikker Supabase-klient
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Opdater transaktionens status i databasen
    const { error: dbError } = await supabase
      .from('transactions')
      .update({ status: status.toUpperCase() })
      .eq('gemba_reference', transfer_id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
