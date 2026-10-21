'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinBoxes from '@/components/PinBoxes';

export default function CreatePinPage() {
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const confirming = first.length === 4;

  const save = async (pin: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/pin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }
      if (res.status === 403) {
        router.replace('/login-pin');
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error('save_failed');
      router.replace('/enable-passkey');
      router.refresh();
    } catch {
      setError('Could not save your PIN. Try again.');
      setFirst('');
      setValue('');
      setSaving(false);
    }
  };

  const handleChange = (v: string) => {
    setValue(v);
    setError('');
    if (v.length < 4) return;

    if (!confirming) {
      setFirst(v);
      setValue('');
    } else if (v === first) {
      save(v);
    } else {
      setError("PINs don't match. Start again.");
      setFirst('');
      setValue('');
    }
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
        <span style={{ fontSize: '0.65rem', color: '#0feff0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
          Step {confirming ? 2 : 1} of 2
        </span>
        <h2 style={{ fontSize: '1.2rem', color: '#ffffff', margin: '0.3rem 0 0.2rem' }}>
          {confirming ? 'Confirm your PIN' : 'Create your PIN'}
        </h2>
        <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
          {confirming ? 'Enter the same 4 digits again' : 'Choose 4 digits to log in quickly next time'}
        </p>

        <div style={{ marginTop: '1.5rem' }}>
          <PinBoxes key={confirming ? 'confirm' : 'create'} value={value} onChange={handleChange} error={!!error} disabled={saving} />
        </div>

        <p style={{ minHeight: '1.1rem', margin: '1rem 0 0', fontSize: '0.7rem', fontWeight: 600, color: error ? '#f87171' : '#0feff0' }}>
          {error || (saving ? 'Saving...' : '')}
        </p>
      </div>
    </div>
  );
}
