import { NextResponse } from 'next/server';
import { verificationStore } from '@/lib/authStore';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'E-mail og kode er påkrævet.' }, { status: 400 });
    }

    const record = verificationStore.get(email);

    if (!record) {
      return NextResponse.json({ error: 'Ingen aktiv anmodning fundet for denne e-mail.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      verificationStore.delete(email);
      return NextResponse.json({ error: 'Verifikationskoden er udløbet.' }, { status: 400 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: 'Ugyldig verifikationskode.' }, { status: 400 });
    }

    verificationStore.delete(email);

    return NextResponse.json({ 
      success: true, 
      message: 'Identitet bekræftet med succes!',
      userType: record.userType 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Kunne ikke verificere koden.' }, { status: 500 });
  }
}
