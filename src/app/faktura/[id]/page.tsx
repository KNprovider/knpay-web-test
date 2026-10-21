import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { InvoiceDetailActions } from "@/components/InvoiceDetailActions";
import { formatDkk, invoiceStatus } from "@/lib/format";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, recipient_name, recipient_cvr, recipient_email, description, total_amount, status, reference, due_date, paid_at, company_id"
    )
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <a href={`/dashboard?company=${invoice.company_id}`} className="mb-4 inline-block text-xs text-knpay-muted">
        ← Back
      </a>

      <h1 className="mb-1 text-xl font-bold">{invoice.invoice_number}</h1>
      <p className="mb-6 text-sm text-knpay-muted">{invoice.recipient_name}{invoice.recipient_cvr ? ` · CVR ${invoice.recipient_cvr}` : ""}</p>

      <div className="mb-6 space-y-2 rounded-xl border border-knpay-border bg-knpay-panel p-4 text-sm">
        <Row label="Description" value={invoice.description ?? "—"} />
        <Row label="Amount" value={formatDkk(invoice.total_amount)} />
        <Row label="Due date" value={invoice.due_date ?? "—"} />
        <Row label="Status" value={invoiceStatus(invoice.status).label} />
      </div>

      <InvoiceDetailActions
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        recipientEmail={invoice.recipient_email}
        amountDkk={Number(invoice.total_amount ?? 0)}
        reference={invoice.reference ?? invoice.invoice_number}
        status={invoice.status}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-knpay-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
