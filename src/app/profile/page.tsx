'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user] = useState({
    name: 'Alexander V. Holm',
    phone: '+45 20 30 40 50',
    email: 'alexander@knprovider.com',
    status: 'KYC Godkendt',
  });

  const handleLogout = () => {
    // Nulstil session / PIN-login og omdiriger
    router.push('/login-pin');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
          <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
          <p className="text-xs text-white">Known. Needed. Proven.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
            <div>
              <h2 className="text-base font-bold text-white">{user.name}</h2>
              <p className="text-xs text-zinc-400">{user.phone}</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              {user.status}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">E-mailadresse</label>
              <p className="text-xs font-semibold text-zinc-200 mt-0.5">{user.email}</p>
            </div>

            <div className="pt-2 border-t border-zinc-800/60">
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full text-left py-2.5 text-xs font-semibold text-zinc-300 hover:text-cyan-400 transition-colors flex justify-between items-center"
              >
                <span>Skift PIN-kode</span>
                <span className="text-zinc-600">&rarr;</span>
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800/60">
              <button
                onClick={handleLogout}
                className="w-full text-left py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors flex justify-between items-center"
              >
                <span>Log ud</span>
                <span className="text-red-400/50">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
