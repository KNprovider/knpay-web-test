import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateCompanyForm } from "@/components/CreateCompanyForm";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { Plus } from "lucide-react";
import { formatDkk, invoiceStatus } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company: companyIdParam } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("user_companies")
    .select("company_id, role, display_name, companies(id, name, cvr)")
    .eq("user_id", userData.user.id);

  const companies = (memberships ?? [])
    .map((m: any) => m.companies)
    .filter(Boolean);

  if (companies.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-xl font-bold">Welcome to KNprovider</h1>
        <p className="mb-6 text-sm text-knpay-muted">
          Create your company to start sending invoices.
        </p>
        <CreateCompanyForm userId={userData.user.id} />
      </main>
    );
  }

  const activeCompanyId = companyIdParam ?? companies[0].id;
  const activeCompany = companies.find((c: any) => c.id === activeCompanyId) ?? companies[0];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, recipient_name, total_amount, status, due_date, created_at")
    .eq("company_id", activeCompany.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">KNprovider</h1>
          <p className="text-xs text-knpay-muted">{activeCompany.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <CompanySwitcher companies={companies} activeCompanyId={activeCompany.id} />
          <LogoutButton />
        </div>
      </div>

      <Link
        href={`/faktura/opret?company=${activeCompany.id}`}
        className="btn-metal mb-6 flex items-center justify-center gap-2 rounded-xl py-3 text-sm"
      >
        <Plus size={16} /> New invoice
      </Link>

      <div className="space-y-2">
        {(invoices ?? []).length === 0 && (
          <p className="rounded-xl border border-knpay-border bg-knpay-panel p-6 text-center text-sm text-knpay-muted">
            No invoices yet.
          </p>
        )}
        {(invoices ?? []).map((inv: any) => (
          <Link
            key={inv.id}
            href={`/faktura/${inv.id}`}
            className="flex items-center justify-between rounded-xl border border-knpay-border bg-knpay-panel p-4 text-sm hover:border-knpay-accent/40"
          >
            <div>
              <p className="font-medium">{inv.invoice_number}</p>
              <p className="text-xs text-knpay-muted">{inv.recipient_name}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatDkk(inv.total_amount)}</p>
              <StatusBadge status={inv.status} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = invoiceStatus(status);
  return <p className={`text-xs ${cfg.cls}`}>{cfg.label}</p>;
}
