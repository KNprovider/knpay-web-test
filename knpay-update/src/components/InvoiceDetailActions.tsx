"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Share2, Check, CheckCircle2 } from "lucide-react";
import { generateBankTransferQRString } from "@/lib/bank-transfer/config";

export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
  recipientEmail,
  amountDkk,
  reference,
  status,
}: {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string | null;
  amountDkk: number;
  reference: string;
  status: string;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const router = useRouter();

  const paymentLink =
    typeof window !== "undefined" ? `${window.location.origin}/faktura/vis/${invoiceId}` : "";

  const qrValue = generateBankTransferQRString({ amountDkk, reference });

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pay invoice",
          text: `Pay ${amountDkk.toFixed(2)} DKK by bank transfer:`,
          url: paymentLink,
        });
        return;
      } catch {
        // The user cancelled — fall back to copying the link
      }
    }
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirm() {
    setConfirming(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount: amountDkk,
        admin_confirmed_by: userData?.user?.email ?? userData?.user?.id,
      })
      .eq("id", invoiceId);

    if (!error) {
      setCurrentStatus("paid");
      if (recipientEmail) {
        fetch("/api/email/payment-confirmed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: recipientEmail, invoiceNumber, amountDkk }),
        }).catch(() => {
          // An email failure must not block the confirmation itself
        });
      }
      router.refresh();
    }
    setConfirming(false);
  }

  if (currentStatus === "paid") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-knpay-accent/30 bg-knpay-accent/10 p-4 text-sm text-knpay-accent">
        <CheckCircle2 size={18} /> Paid
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-knpay-border bg-knpay-panel p-6">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={qrValue} size={160} level="M" />
        </div>

        <button
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-knpay-border py-2.5 text-sm"
        >
          {copied ? <Check size={16} className="text-knpay-accent" /> : <Share2 size={16} />}
          {copied ? "Link copied!" : "Share payment link with the customer"}
        </button>

        <p className="break-all text-center text-xs text-knpay-muted">{paymentLink}</p>
      </div>

      {currentStatus === "bank_transfer_claimed" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          The customer has marked the invoice as paid. Check your account and confirm below.
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={confirming}
        className="btn-metal flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-60"
      >
        {confirming && <Loader2 size={16} className="animate-spin" />}
        Confirm payment
      </button>
    </div>
  );
}
