import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicInvoiceQR } from "@/components/PublicInvoiceQR";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id, invoice_number, recipient_name, total_amount, reference, status")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-12">
      <h1 className="mb-1 text-xl font-bold text-white">Pay invoice {invoice.invoice_number}</h1>
      <p className="mb-8 text-sm text-knpay-muted">To {invoice.recipient_name}</p>

      <PublicInvoiceQR
        invoiceId={invoice.id}
        amountDkk={Number(invoice.total_amount ?? 0)}
        reference={invoice.reference ?? invoice.invoice_number}
        initialStatus={invoice.status}
      />
    </main>
  );
}
