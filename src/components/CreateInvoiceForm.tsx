"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function CreateInvoiceForm({ companyId }: { companyId: string }) {
  const [recipientType, setRecipientType] = useState<"b2b" | "b2c">("b2b");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCvr, setRecipientCvr] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          recipient_type: recipientType,
          recipient_name: recipientName,
          recipient_cvr: recipientType === "b2b" ? recipientCvr : null,
          description,
          amount_ex_vat: parseFloat(amount),
          due_date: dueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the invoice.");

      router.push(`/faktura/${data.id ?? data.invoiceId}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-knpay-border bg-knpay-panel p-6">
      <div className="flex rounded-lg border border-knpay-border p-1 text-sm">
        <button
          type="button"
          onClick={() => setRecipientType("b2b")}
          className={`flex-1 rounded-md py-1.5 ${recipientType === "b2b" ? "btn-metal" : "text-knpay-muted"}`}
        >
          Business (B2B)
        </button>
        <button
          type="button"
          onClick={() => setRecipientType("b2c")}
          className={`flex-1 rounded-md py-1.5 ${recipientType === "b2c" ? "btn-metal" : "text-knpay-muted"}`}
        >
          Individual (B2C)
        </button>
      </div>

      <Field label="Customer name" value={recipientName} onChange={setRecipientName} required />
      {recipientType === "b2b" && (
        <Field label="Customer CVR number" value={recipientCvr} onChange={setRecipientCvr} />
      )}
      <Field label="Description" value={description} onChange={setDescription} />
      <Field label="Amount excl. VAT (DKK)" value={amount} onChange={setAmount} type="number" required />
      <Field label="Due date" value={dueDate} onChange={setDueDate} type="date" required />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !companyId}
        className="btn-metal flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Create invoice
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-knpay-muted">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-knpay-border bg-black/30 px-3 py-2 text-sm outline-none focus:border-knpay-accent"
      />
    </div>
  );
}
