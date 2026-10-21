import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload.verification_token) {
      return NextResponse.json({ verification_token: payload.verification_token });
    }

    console.log("Modtaget Gemba event:", payload.event_type || payload);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
