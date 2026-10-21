import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/faktura/claim
 * Body: { invoiceId: string }
 *
 * Public route (no login required) — the customer taps "I have made the transfer"
 * on the shared payment page. Sets the status to "bank_transfer_claimed" so the
 * company can see it and confirm it in their dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = (await req.json()) as { invoiceId: string };
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is missing" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invoice, error: fetchErr } = await admin
      .from("invoices")
      .select("id, status")
      .eq("id", invoiceId)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "The invoice has already been paid" }, { status: 409 });
    }

    const { error: updateErr } = await admin
      .from("invoices")
      .update({
        status: "bank_transfer_claimed",
        transfer_type: "bank_transfer",
        customer_claimed_paid_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("faktura/claim error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
