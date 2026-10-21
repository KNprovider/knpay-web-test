'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { createClient } from '@/lib/supabase/client';
import { cleanName, nameSuggestions } from '@/lib/names';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const LABEL: CSSProperties = { display: 'block', fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.1em' };
const INPUT: CSSProperties = { width: '100%', padding: '0.85rem 1rem', borderRadius: '1rem', backgroundColor: 'rgba(10, 10, 10, 0.55)', color: '#ffffff', border: '1px solid rgba(15, 239, 240, 0.35)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' };
const ERR: CSSProperties = { color: '#f87171', fontSize: '0.7rem', margin: 0, textAlign: 'center' };
const LINK: CSSProperties = { background: 'none', border: 'none', color: '#0feff0', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' };

// Finds the country from what the user has typed, e.g. "+45 12 34 56 78" -> Denmark
function detectCountry(value: string): { name: string; dial: string } | null {
  if (!value.trim().startsWith('+')) return null;
  const typer = new AsYouType();
  typer.input(value);
  const code = typer.getCountry() ?? parsePhoneNumberFromString(value)?.country;
  const dial = typer.getCallingCode();
  if (!code || !dial) return null;
  return { name: regionNames.of(code) ?? code, dial };
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [national, setNational] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanFirst = cleanName(firstName);
  const cleanLast = cleanName(lastName);
  const suggestions = useMemo(() => nameSuggestions(cleanFirst, cleanLast), [cleanFirst, cleanLast]);

  const hasPlus = national.trim().startsWith('+');
  const missingCode = national.trim().length > 0 && !hasPlus;
  const detected = useMemo(() => detectCountry(national), [national]);

  const goToDisplayName = () => {
    setDisplayName(suggestions[0] ?? '');
    setError('');
    setStep(2);
  };

  const saveProfile = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: cleanFirst, lastName: cleanLast, displayName }),
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) throw new Error('save_failed');
      setStep(3);
    } catch {
      setError('Could not save your details. Try again.');
    }
    setBusy(false);
  };

  const handleNumber = (v: string) => {
    setNational(v.replace(/[^\d+\s]/g, ''));
    setError('');
  };

  // No SMS check: the number is saved as the customer typed it
  const savePhone = async () => {
    if (!hasPlus) {
      setError('Enter country code, for example +45.');
      return;
    }
    const parsed = parsePhoneNumberFromString(national);
    if (!parsed || !parsed.isValid()) {
      setError('Enter a valid phone number.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.number }),
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.status === 409) {
        setError('This number is already registered.');
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error('save_failed');
      router.replace('/create-pin');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
      setBusy(false);
    }
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const title = step === 1 ? 'Your name' : step === 2 ? 'Choose your display name' : 'Your phone number';
  const subtitle =
    step === 1
      ? 'Your full name stays private.'
      : step === 2
      ? 'This is what other KNprovider users see.'
      : 'Friends can send you money with it.';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y' }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>KNprovider</h1>
          <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '0.28em', color: 'rgba(15, 239, 240, 0.7)', textTransform: 'uppercase' }}>Provided by KN</p>
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '340px',
            boxSizing: 'border-box',
            padding: '1.75rem 1.25rem 1.5rem',
            borderRadius: '1.75rem',
            backgroundColor: 'rgba(20, 20, 20, 0.35)',
            border: '1px solid rgba(15, 239, 240, 0.35)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#0feff0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Step {step} of 3</span>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff', margin: '0.3rem 0 0.2rem' }}>{title}</h2>
            <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{subtitle}</p>
          </div>

          {step === 1 && (
            <>
              <div>
                <label style={LABEL}>First name</label>
                <input type="text" autoComplete="given-name" autoCapitalize="words" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Name" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Last name</label>
                <input type="text" autoComplete="family-name" autoCapitalize="words" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Surname" style={INPUT} />
              </div>
              <button type="button" onClick={goToDisplayName} disabled={!cleanFirst || !cleanLast} className="btn-metal w-full py-3 text-xs cursor-pointer shadow-lg" style={{ borderRadius: '1rem', opacity: !cleanFirst || !cleanLast ? 0.5 : 1 }}>
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {suggestions.map((s) => {
                  const selected = s === displayName;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDisplayName(s)}
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '1.1rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: selected ? '#0feff0' : '#ffffff',
                        backgroundColor: selected ? 'rgba(15, 239, 240, 0.12)' : 'rgba(10, 10, 10, 0.55)',
                        border: selected ? '2px solid #0feff0' : '1px solid rgba(15, 239, 240, 0.35)',
                        boxShadow: selected ? '0 0 16px rgba(15, 239, 240, 0.3)' : 'none',
                        transition: 'all .2s ease',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {error && <p style={ERR}>{error}</p>}
              <button type="button" onClick={saveProfile} disabled={busy || !displayName} className="btn-metal w-full py-3 text-xs cursor-pointer shadow-lg" style={{ borderRadius: '1rem', opacity: busy || !displayName ? 0.5 : 1 }}>
                {busy ? 'Saving...' : 'Continue'}
              </button>
              <button type="button" onClick={() => { setError(''); setStep(1); }} style={LINK}>Back</button>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label style={LABEL}>Phone number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  value={national}
                  onChange={(e) => handleNumber(e.target.value)}
                  placeholder="Enter country code, e.g. +45 12 34 56 78"
                  style={INPUT}
                />
                <p style={{ margin: '0.5rem 0 0', minHeight: '1rem', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center', color: '#0feff0' }}>
                  {detected ? `${detected.name} (+${detected.dial})` : ''}
                </p>
              </div>
              {(error || missingCode) && <p style={ERR}>{error || 'Enter country code, for example +45.'}</p>}
              <button
                type="button"
                onClick={savePhone}
                disabled={busy || !hasPlus || national.trim().length < 5}
                className="btn-metal w-full py-3 text-xs cursor-pointer shadow-lg"
                style={{ borderRadius: '1rem', opacity: busy || !hasPlus || national.trim().length < 5 ? 0.5 : 1 }}
              >
                {busy ? 'Saving...' : 'Continue'}
              </button>
              <button type="button" onClick={() => { setError(''); setStep(2); }} style={LINK}>Back</button>
            </>
          )}
        </div>

        <button type="button" onClick={logOut} style={{ ...LINK, color: '#9ca3af', marginTop: '1.25rem' }}>
          Log out
        </button>
      </div>
    </div>
  );
}
