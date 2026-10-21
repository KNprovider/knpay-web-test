'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (data) setTransactions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
          <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
          <p className="text-xs text-white">Known. Needed. Proven.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6 shadow-2xl backdrop-blur-md">
          <h2 className="mb-4 text-base font-bold text-white">Transaktionshistorik</h2>

          {loading ? (
            <p className="py-6 text-center text-xs text-zinc-400">Henter overførsler...</p>
          ) : transactions.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">Ingen overførsler fundet endnu.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id || tx.gemba_reference}
                  onClick={() => setSelectedTx(tx)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      {tx.type === 'OUTGOING_TRANSFER' ? 'Overførsel' : 'Indbetaling'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(tx.created_at || Date.now()).toLocaleDateString('da-DK')}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {tx.amount} DKK
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kvitterings-modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Kvittering</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-xs text-zinc-500 hover:text-white"
              >
                LUK &#x2715;
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Beløb</span>
                <p className="text-lg font-extrabold text-white">{selectedTx.amount} DKK</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Modtager / Konto</span>
                <p className="text-xs font-semibold text-zinc-300 font-mono">{selectedTx.iban || 'DK5030000000123456'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Referencenummer</span>
                <p className="text-[11px] font-mono text-cyan-400">{selectedTx.gemba_reference || selectedTx.id || 'REF-98765432'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Dato & Tid</span>
                <p className="text-xs text-zinc-300">
                  {new Date(selectedTx.created_at || Date.now()).toLocaleString('da-DK')}
                </p>
              </div>

              <div className="pt-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Gennemført (Gemba API)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
