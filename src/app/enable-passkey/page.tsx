'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  biometricsAvailable,
  passkeyEnabled,
  markPasskeyEnabled,
  markPasskeyDismissed,
} from '@/lib/passkey';

export default function EnablePasskeyPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goOn = () => {
    router.replace('/dashboard');
    router.refresh();
  };

  // Skip straight on if this is a computer, the device has no biometrics, or it already has a passkey
  useEffect(() => {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    biometricsAvailable().then((ok) => {
      if (!ok || !isTouchDevice || passkeyEnabled()) {
        goOn();
        return;
      }
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      const auth: any = createClient().auth;
      if (typeof auth.registerPasskey !== 'function') throw new Error('unsupported');
      const { error } = await auth.registerPasskey();
      if (error) throw error;
      markPasskeyEnabled();
      goOn();
    } catch (err: any) {
      console.error('Passkey setup failed:', err);
      const reason = err?.message ? ` (${err.message})` : '';
      setError(`Could not turn on Face ID or fingerprint right now${reason}. Try again, or skip and use your PIN.`);
      setBusy(false);
    }
  };

  // "Not now" is remembered on this device. It can be turned on later under Profile.
  const skip = () => {
    markPasskeyDismissed();
    goOn();
  };

  if (!ready) return null;

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
        <h2 style={{ fontSize: '1.2rem', color: '#ffffff', margin: '0 0 0.4rem' }}>
          Log in faster
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
          Use Face ID or fingerprint instead of typing your PIN.
        </p>

        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="btn-metal"
          style={{
            width: '100%',
            marginTop: '1.5rem',
            padding: '0.9rem',
            borderRadius: '0.75rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            color: '#ffffff',
            border: '1px solid rgba(15, 239, 240, 0.45)',
          }}
        >
          {busy ? 'Please wait...' : 'Turn on'}
        </button>

        <button
          type="button"
          onClick={skip}
          disabled={busy}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: '#9ca3af',
            textDecoration: 'underline',
          }}
        >
          Not now
        </button>

        <p style={{ minHeight: '1.1rem', margin: '1rem 0 0', fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.5 }}>
          {error}
        </p>
      </div>
    </div>
  );
}
