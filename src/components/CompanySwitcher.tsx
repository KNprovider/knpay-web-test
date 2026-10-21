"use client";

import { useRouter } from "next/navigation";

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: { id: string; name: string }[];
  activeCompanyId: string;
}) {
  const router = useRouter();
  if (companies.length <= 1) return null;

  return (
    <select
      value={activeCompanyId}
      onChange={(e) => router.push(`/dashboard?company=${e.target.value}`)}
      className="rounded-lg border border-knpay-border bg-black/30 px-3 py-1.5 text-xs"
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
