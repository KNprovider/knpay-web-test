import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verificationStore } from '@/lib/authStore';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await request.json();
    const { email, userType, companyName, cvr } = body;

    if (!email || !userType) {
      return NextResponse.json({ error: 'E-mail og brugertype er påkrævet.' }, { status: 400 });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationStore.set(email, { code: verificationCode, expiresAt, userType });

    const { error } = await resend.emails.send({
      from: 'KNprovider <noreply@knprovider.com>',
      to: [email],
      subject: 'Din verifikationskode til login',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Bekræft din identitet</h2>
          <p>Tak fordi du logger ind som <strong>${userType === 'erhverv' ? 'Erhverv' : 'Privat'}</strong>.</p>
          ${userType === 'erhverv' && companyName ? `<p>Virksomhed: ${companyName} (CVR:${cvr})</p>` : ''}
          <p>Indtast venligst følgende 6-cifrede kode:</p>
          <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 4px;">${verificationCode}</h1>
          <p>Koden udløber om 10 minutter.</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Verifikationskode sendt til e-mail.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Der opstod en intern fejl.' }, { status: 500 });
  }
}
