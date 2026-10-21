import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName } = await request.json();

    const response = await fetch(`${process.env.GEMBA_API_URL || 'https://sandbox.ge.mba'}/v1/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMBA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        corporate_id: process.env.GEMBA_CORPORATE_ID,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
