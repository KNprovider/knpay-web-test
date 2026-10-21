/** Formats an amount as e.g. "1,234.50 DKK" */
export function formatDkk(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DKK`;
}

/** Human-readable invoice status + text colour class */
export function invoiceStatus(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Paid", cls: "text-knpay-accent" },
    pending_bank: { label: "Awaiting bank", cls: "text-amber-400" },
    bank_transfer_claimed: { label: "Payment claimed", cls: "text-amber-400" },
    overdue: { label: "Overdue", cls: "text-red-400" },
    payment_mismatch: { label: "Payment mismatch", cls: "text-red-400" },
  };
  return map[status] ?? { label: "Pending", cls: "text-knpay-muted" };
}
 
