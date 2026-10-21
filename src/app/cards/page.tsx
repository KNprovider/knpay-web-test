'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CardsPage() {
  const [cards] = useState([
    {
      id: '1',
      bankName: 'Danske Bank',
      accountType: 'Lønkonto',
      ibanNumber: 'DK50 3000 0000 1234 56',
      isPrimary: true,
    },
    {
      id: '2',
      bankName: 'Nordea',
      accountType: 'Opsparing',
      ibanNumber: 'DK12 2000 0000 9876 54',
      isPrimary: false,
    },
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
          <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
          <p className="text-xs text-white">Known. Needed. Proven.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Mina Bankkonti & Kort</h2>
            <Link
              href="/payment"
              className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-zinc-700"
            >
              + Tilføj
            </Link>
          </div>

          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl border p-4 transition-all ${
                  card.isPrimary
                    ? 'border-cyan-500/50 bg-zinc-900/90 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">{card.bankName}</span>
                  {card.isPrimary && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                      Primær
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{card.accountType}</p>
                <p className="mt-2 text-[11px] font-mono text-zinc-400">{card.ibanNumber}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
