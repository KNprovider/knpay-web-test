import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { convertDkToIban } from '@/lib/iban';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/pin';
import { SEND_PROOF_COOKIE, checkSendProof } from '@/lib/sendProof';

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, recipient, pin, regNumber, accountNumber, recipientBic, reference } = body;

    // 1. Basic input validation
    if (!amount || !recipient) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (amount or recipient phone)' },
        { status: 400 }
      );
    }
    if (!(Number(amount) > 0)) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }
    const pinGiven = pin != null && String(pin).trim() !== '';
    if (pinGiven && !/^\d{4}$/.test(String(pin).trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN code (must be 4 digits)' },
        { status: 401 }
      );
    }

    // 2. The sender is the logged-in user from the session, never from the request body
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }
    const supabase = createAdminClient();

    // 3. Confirm it is really the customer: the PIN, or a fresh Face ID / fingerprint proof
    let confirmedByPasskey = false;

    if (!pinGiven) {
      const proof = (await cookies()).get(SEND_PROOF_COOKIE)?.value;
      confirmedByPasskey = await checkSendProof(proof, user.id);
      if (!confirmedByPasskey) {
        return NextResponse.json(
          { success: false, error: 'Confirm with your PIN or Face ID.' },
          { status: 401 }
        );
      }
    } else {
      const { data: pinRow } = await supabase
        .from('user_pins')
        .select('pin_hash, failed_attempts')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!pinRow) {
        return NextResponse.json(
          { success: false, error: 'Create a PIN before sending money.' },
          { status: 403 }
        );
      }

      if (!(await verifyPin(String(pin).trim(), pinRow.pin_hash))) {
        const attempts = pinRow.failed_attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await supabase.from('user_pins').update({ failed_attempts: 0 }).eq('user_id', user.id);
          await auth.auth.signOut();
          return NextResponse.json(
            { success: false, error: 'Too many wrong PINs. Logged out.' },
            { status: 423 }
          );
        }
        await supabase.from('user_pins').update({ failed_attempts: attempts }).eq('user_id', user.id);
        return NextResponse.json(
          { success: false, error: 'Incorrect PIN code. Transaction declined.' },
          { status: 401 }
        );
      }
      if (pinRow.failed_attempts > 0) {
        await supabase.from('user_pins').update({ failed_attempts: 0 }).eq('user_id', user.id);
      }
    }

    // 4. Balance check (skipped when the profile has no balance value)
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .maybeSingle();

    if (senderProfile && senderProfile.balance != null && Number(senderProfile.balance) < Number(amount)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient funds on account. Transaction declined.' },
        { status: 400 }
      );
    }

    // 5. Recipient lookup
    const { data: recipientMember, error: recipientError } = await supabase
      .from('profiles')
      .select('id, phone, full_name')
      .eq('phone', String(recipient).trim())
      .maybeSingle();

    if (recipientError) console.error('Error looking up recipient member:', recipientError);

    if (!recipientMember) {
      return NextResponse.json(
        {
          success: false,
          code: 'USER_NOT_FOUND',
          error: 'Recipient phone number is not registered on KNprovider.',
        },
        { status: 404 }
      );
    }

    // 6. Convert account details to IBAN format
    const effectiveReg = regNumber || '1234';
    const effectiveAcc = accountNumber || '1234567890';
    const recipientIban = convertDkToIban(effectiveReg, effectiveAcc);

    // 7. Execute transaction via Gemba Banking API
    const gembaResponse = await fetch('https://api.gemba.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.GEMBA_API_KEY!,
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency: 'DKK',
        destination_iban: recipientIban,
        destination_bic: recipientBic,
        reference: reference || `KNprovider transfer to ${recipient}`,
      }),
    });

    const gembaRes = await gembaResponse.json().catch(() => ({ id: `kn_mock_${Date.now()}` }));

    if (!gembaResponse.ok && process.env.NODE_ENV === 'production') {
      throw new Error(gembaRes.message || 'Gemba API rejected the transfer request.');
    }

    // 8. Record the transaction for the logged-in user
    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      amount: -Number(amount),
      currency: 'DKK',
      type: 'OUTGOING_TRANSFER',
      recipient_phone: recipient,
      recipient_iban: recipientIban,
      gemba_reference: gembaRes.id || `kn_${Date.now()}`,
      status: 'COMPLETED',
    });
    if (insertError) console.error('Failed to record transaction:', insertError);

    const res = NextResponse.json({
      success: true,
      iban: recipientIban,
      transferId: gembaRes.id || `kn_${Date.now()}`,
    });
    // The Face ID proof is used up
    if (confirmedByPasskey) res.cookies.delete(SEND_PROOF_COOKIE);
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
