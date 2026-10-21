import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/email/sendEmail";

export async function POST(req: NextRequest) {
  try {
    const { to, invoiceNumber, amountDkk } = (await req.json()) as {
      to: string;
      invoiceNumber: string;
      amountDkk: number;
    };
    if (!to) return NextResponse.json({ error: "to is missing" }, { status: 400 });

    await sendEmail({
      to,
      subject: `Payment confirmed — invoice ${invoiceNumber}`,
      html: emailWrapper(`
        <p>We have confirmed receipt of your payment of <strong>${amountDkk.toFixed(2)} DKK</strong>
        for invoice <strong>${escapeHtml(invoiceNumber)}</strong>.</p>
        <p>Thank you for your business.</p>
      `),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("payment-confirmed email error:", err);
    return NextResponse.json({ error: "Could not send email" }, { status: 500 });
  }
}
