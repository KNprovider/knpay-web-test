'use client';

import { useState } from 'react';

export default function TransferForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      userId,
      amount: Number(formData.get('amount')),
      regNumber: formData.get('regNumber'),
      accountNumber: formData.get('accountNumber'),
      recipientBic: formData.get('recipientBic'),
      reference: formData.get('reference'),
    };

    try {
      const res = await fetch('/api/bank-transfer/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transfer failed');

      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-xl">
      <h2 className="text-xl font-bold mb-4 text-amber-400">Make a bank transfer</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Registration number (4 digits)</label>
          <input 
            name="regNumber" 
            required 
            placeholder="e.g. 1234" 
            maxLength={4} 
            className="w-full p-2 bg-zinc-800 rounded border border-zinc-700 focus:border-amber-500 outline-none" 
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Account number (up to 10 digits)</label>
          <input 
            name="accountNumber" 
            required 
            placeholder="e.g. 1234567890" 
            maxLength={10} 
            className="w-full p-2 bg-zinc-800 rounded border border-zinc-700 focus:border-amber-500 outline-none" 
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Amount (DKK)</label>
          <input 
            name="amount" 
            type="number" 
            step="0.01" 
            required 
            placeholder="0.00" 
            className="w-full p-2 bg-zinc-800 rounded border border-zinc-700 focus:border-amber-500 outline-none" 
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Recipient BIC / SWIFT</label>
          <input 
            name="recipientBic" 
            required 
            placeholder="e.g. NRDADK22" 
            className="w-full p-2 bg-zinc-800 rounded border border-zinc-700 focus:border-amber-500 outline-none" 
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Message to recipient (reference)</label>
          <input 
            name="reference" 
            required 
            placeholder="Invoice / Payment" 
            className="w-full p-2 bg-zinc-800 rounded border border-zinc-700 focus:border-amber-500 outline-none" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Processing transfer...' : 'Approve and transfer'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-950/50 border border-red-800 text-red-200 rounded text-sm">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded text-sm">
          <p className="font-bold">Transfer completed successfully!</p>
          <p className="text-xs text-zinc-300 mt-1">Converted recipient IBAN: {result.iban}</p>
          <p className="text-xs text-zinc-300">Transaction ID: {result.transferId}</p>
        </div>
      )}
    </div>
  );
}
