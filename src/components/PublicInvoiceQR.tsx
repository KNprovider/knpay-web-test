"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { generateBankTransferQRString, KNPAY_IBAN, KNPAY_BENEFICIARY_NAME } from "@/lib/bank-transfer/config";

export function PublicInvoiceQR({
  invoiceId,
  amountDkk,
  reference,
  initialStatus,
}: {
  invoiceId: string;
  amountDkk: number;
  reference: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrValue = generateBankTransferQRString({ amountDkk, reference });

  async function handleClaim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/faktura/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register the payment.");
      setStatus("bank_transfer_claimed");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "paid") {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-knpay-accent/30 bg-knpay-accent/10 p-8 text-center">
        <CheckCircle2 className="text-knpay-accent" size={32} />
        <p className="font-semibold">Payment confirmed — thank you!</p>
      </div>
    );
  }

  if (status === "bank_transfer_claimed") {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-knpay-border bg-knpay-panel p-8 text-center">
        <Loader2 className="animate-spin text-knpay-accent" size={28} />
        <p className="font-semibold">We are confirming your payment</p>
        <p className="text-sm text-knpay-muted">Thank you! The invoice will be updated as soon as we have checked the account.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-5 rounded-2xl border border-knpay-border bg-knpay-panel p-6 text-center">
      <div className="rounded-xl bg-white p-4">
        <QRCodeSVG value={qrValue} size={200} level="M" />
      </div>

      <p className="text-xs text-knpay-muted">Scan if your banking app supports it, or enter the details manually below</p>

      <div className="w-full space-y-2 rounded-xl bg-black/30 p-4 text-left font-mono text-sm">
        <Row label="Recipient" value={KNPAY_BENEFICIARY_NAME} />
        <Row label="IBAN" value={KNPAY_IBAN} />
        <Row label="Amount" value={`${amountDkk.toFixed(2)} DKK`} />
        <Row label="Reference" value={reference} highlight />
      </div>

      <p className="text-xs text-amber-400">
        ⚠️ The reference MUST be included in the transfer, otherwise the payment cannot be matched.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleClaim}
        disabled={loading}
        className="btn-metal flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        I have made the transfer
      </button>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-knpay-muted">{label}</span>
      <span className={`text-right ${highlight ? "font-bold text-knpay-accent" : "text-white"}`}>{value}</span>
    </div>
  );
}
