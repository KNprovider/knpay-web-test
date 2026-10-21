'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { biometricsAvailable, passkeyEnabled } from '@/lib/passkey';
import PinBoxes from '@/components/PinBoxes';

export default function LoginPinPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canUsePasskey, setCanUsePasskey] = useState(false);

  useEffect(() => {
    // Face ID / fingerprint is only offered on phones and tablets where it has been turned on
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    biometricsAvailable().then((ok) => setCanUsePasskey(ok && isTouchDevice && passkeyEnabled()));
  }, []);

  const goToDashboard = () => {
    router.replace('/dashboard');
    router.refresh();
  };

  const verifyPin = async (pin: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        goToDashboard();
        return;
      }
      if (res.status === 423 || data.error === 'no_session') {
        router.replace('/login');
        router.refresh();
        return;
      }
      if (data.error === 'no_pin') {
        router.replace('/create-pin');
        router.refresh();
        return;
      }

      setValue('');
      setError(
        data.error === 'wrong_pin' && typeof data.remaining === 'number'
          ? `Wrong PIN. ${data.remaining} ${data.remaining === 1 ? 'try' : 'tries'} left.`
          : 'Could not check your PIN. Try again.'
      );
    } catch {
      setValue('');
      setError('Could not check your PIN. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (v: string) => {
    setValue(v);
    setError('');
    if (v.length === 4) verifyPin(v);
  };

  const loginWithPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      const auth: any = createClient().auth;
      if (typeof auth.signInWithPasskey !== 'function') throw new Error('unsupported');
      const { error: passkeyError } = await auth.signInWithPasskey();
      if (passkeyError) throw passkeyError;

      // A fresh login unlocks the app (the server checks this)
      const res = await fetch('/api/pin/status', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.unlocked) throw new Error('not_unlocked');

      goToDashboard();
    } catch (err) {
      console.error('Passkey login failed:', err);
      setError('Could not use Face ID or fingerprint. Enter your PIN.');
      setBusy(false);
    }
  };

  const forgotPin = async () => {
    await createClient().auth.signOut();
    router.replace('/login?reset=1');
    router.refresh();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          KNprovider
        </h1>
        <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '0.28em', color: 'rgba(15, 239, 240, 0.7)', textTransform: 'uppercase' }}>
          Provided by KN
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '320px',
          textAlign: 'center',
          boxSizing: 'border-box',
          padding: '1.75rem 1.25rem 1.5rem',
          borderRadius: '1.75rem',
          backgroundColor: 'rgba(20, 20, 20, 0.35)',
          border: '1px solid rgba(15, 239, 240, 0.35)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', color: '#ffffff', margin: '0 0 0.2rem' }}>Welcome back</h2>
        <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>Enter your 4-digit PIN</p>

        <div style={{ marginTop: '1.5rem' }}>
          <PinBoxes value={value} onChange={handleChange} error={!!error} disabled={busy} />
        </div>

        <p style={{ minHeight: '1.1rem', margin: '1rem 0 0', fontSize: '0.7rem', fontWeight: 600, color: error ? '#f87171' : '#0feff0' }}>
          {error || (busy ? 'Please wait...' : '')}
        </p>

        {canUsePasskey && (
          <button
            type="button"
            onClick={loginWithPasskey}
            disabled={busy}
            style={{
              width: '100%',
              marginTop: '0.75rem',
              padding: '0.8rem',
              borderRadius: '1rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              color: '#ffffff',
              background: 'rgba(15, 239, 240, 0.08)',
              border: '1px solid rgba(15, 239, 240, 0.45)',
            }}
          >
            Use Face ID or fingerprint
          </button>
        )}

        <button
          type="button"
          onClick={forgotPin}
          disabled={busy}
          style={{ marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#9ca3af', textDecoration: 'underline' }}
        >
          Forgot PIN?
        </button>
      </div>
    </div>
  );
}
