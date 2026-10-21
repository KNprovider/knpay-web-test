'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Uventet fejl opstået:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
          <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
          <p className="text-xs text-white">Known. Needed. Proven.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-base font-bold text-red-400 mb-2">Der opstod en uventet fejl</h2>
          <p className="text-xs text-zinc-400 mb-6">
            Forbindelsen blev afbrudt midlertidigt. Prøv venligst igen.
          </p>

          <button
            onClick={() => reset()}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-xs font-bold text-white transition-all hover:border-cyan-500/50 hover:bg-zinc-800"
          >
            Prøv igen
          </button>
        </div>
      </div>
    </div>
  );
}
