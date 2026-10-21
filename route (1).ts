import { NextResponse } from 'next/server';
import { convertDkToIban } from '@/lib/iban';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId, amount, regNumber, accountNumber, recipientBic, reference } = await request.json();

    if (!userId || !amount || !regNumber || !accountNumber) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Convert Danish registration number and account number to the recipient IBAN
    const recipientIban = convertDkToIban(regNumber, accountNumber);

    // 2. Send the payment to the Gemba API (API key comes from an environment variable)
    const gembaResponse = await fetch('https://api.gemba.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.GEMBA_API_KEY!,
      },
      body: JSON.stringify({
        amount,
        currency: 'DKK',
        destination_iban: recipientIban,
        destination_bic: recipientBic,
        reference,
      }),
    });

    const gembaRes = await gembaResponse.json();

    if (!gembaResponse.ok) {
      throw new Error(gembaRes.message || 'The Gemba API rejected the transfer');
    }

    // 3. Log the transaction in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: dbError } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: -amount,
      currency: 'DKK',
      type: 'OUTGOING_TRANSFER',
      recipient_iban: recipientIban,
      gemba_reference: gembaRes.id,
      status: 'COMPLETED',
    });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      iban: recipientIban, 
      transferId: gembaRes.id 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
