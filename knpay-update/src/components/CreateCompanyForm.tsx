"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function CreateCompanyForm({ userId }: { userId: string }) {
  const [cvr, setCvr] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [city, setCity] = useState("");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCvrLookup() {
    if (!/^\d{8}$/.test(cvr)) {
      setError("The CVR number must be 8 digits.");
      return;
    }
    setLooking(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/company-info?cvr=${cvr}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("CVR lookup failed");
      const data = await res.json();
      setName(data.name ?? "");
      setAddress(data.address ?? "");
      setZipcode(data.zipcode ?? "");
      setCity(data.city ?? "");
    } catch {
      setError("Could not look up the CVR number automatically — please fill in the fields below manually.");
    } finally {
      setLooking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !cvr) {
      setError("Company name and CVR number are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({ cvr, name, address, zipcode, city })
        .select("id")
        .single();

      if (companyErr) throw companyErr;

      const { error: linkErr } = await supabase
        .from("user_companies")
        .insert({ user_id: userId, company_id: company.id, role: "admin" });

      if (linkErr) throw linkErr;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: user.email, companyName: name }),
        }).catch(() => {
          // An email failure must not block company creation
        });
      }

      router.push(`/dashboard?company=${company.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-knpay-border bg-knpay-panel p-6">
      <div>
        <label className="mb-1 block text-xs text-knpay-muted">CVR number</label>
        <div className="flex gap-2">
          <input
            value={cvr}
            onChange={(e) => setCvr(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="12345678"
            className="flex-1 rounded-lg border border-knpay-border bg-black/30 px-3 py-2 text-sm outline-none focus:border-knpay-accent"
          />
          <button
            type="button"
            onClick={handleCvrLookup}
            disabled={looking}
            className="flex items-center gap-1.5 rounded-lg border border-knpay-border px-3 text-sm disabled:opacity-50"
          >
            {looking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Look up
          </button>
        </div>
      </div>

      <Field label="Company name" value={name} onChange={setName} />
      <Field label="Address" value={address} onChange={setAddress} />
      <div className="flex gap-2">
        <Field label="Postcode" value={zipcode} onChange={setZipcode} className="w-24" />
        <Field label="City" value={city} onChange={setCity} className="flex-1" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-metal flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm disabled:opacity-60"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Create company
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-knpay-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-knpay-border bg-black/30 px-3 py-2 text-sm outline-none focus:border-knpay-accent"
      />
    </div>
  );
}
