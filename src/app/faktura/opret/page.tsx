import { CreateInvoiceForm } from "@/components/CreateInvoiceForm";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">New invoice</h1>
      <CreateInvoiceForm companyId={company ?? ""} />
    </main>
  );
}
