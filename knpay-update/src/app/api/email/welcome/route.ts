import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/email/sendEmail";

export async function POST(req: NextRequest) {
  try {
    const { to, companyName } = (await req.json()) as { to: string; companyName: string };
    if (!to) return NextResponse.json({ error: "to is missing" }, { status: 400 });

    await sendEmail({
      to,
      subject: "Welcome to KNprovider",
      html: emailWrapper(`
        <p>Hi ${escapeHtml(companyName)},</p>
        <p>Your company has been created on KNprovider. You can send invoices directly —
        with no middleman fees — and receive payment by bank transfer or card.</p>
        <p style="margin-top:16px;">
          <a href="https://knpay.knprovider.com/dashboard" style="display:inline-block;background:#08ddf0;color:#04181c;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Go to dashboard
          </a>
        </p>
      `),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("welcome email error:", err);
    return NextResponse.json({ error: "Could not send email" }, { status: 500 });
  }
}
