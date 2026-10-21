'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;

        if (data.session) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setMessage('Check your email to confirm your account, then log in.');
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-10 text-center [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
        <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
        <p className="text-xs text-zinc-300">Known. Needed. Proven.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-knpay-panel/70 p-5 shadow-2xl backdrop-blur-sm">
        <div className="tabs-turq mb-5 flex rounded-xl p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 rounded-lg py-2.5 text-sm transition-all ${
              isLogin ? 'btn-metal' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 rounded-lg py-2.5 text-sm transition-all ${
              !isLogin ? 'btn-metal' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-turq w-full rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Password</label>
            <input
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-turq w-full rounded-xl px-4 py-3 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-knpay-accent">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-metal mt-1 w-full rounded-xl py-3.5 text-sm active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
