'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { biometricsAvailable } from '@/lib/passkey';

type Mode = 'login' | 'signup';
type Step = 'email' | 'code';

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9ca3af',
  marginBottom: '0.35rem',
};

// 16px inputs so iPhones do not zoom in when a field is focused
const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '0.75rem',
  padding: '0.8rem 1rem',
  fontSize: '1rem',
  boxSizing: 'border-box',
};

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '0.75rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  cursor: 'pointer',
  color: '#ffffff',
  background: 'rgba(15, 239, 240, 0.08)',
  border: '1px solid rgba(15, 239, 240, 0.45)',
};

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: '0.7rem',
  color: '#9ca3af',
  textDecoration: 'underline',
};

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [reset, setReset] = useState(false); // "Forgot PIN?" (also /login?reset=1)
  const [canUsePasskey, setCanUsePasskey] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') === '1') setReset(true);
    // Face ID / fingerprint is only shown on phones and tablets that have biometrics
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    biometricsAvailable().then((ok) => setCanUsePasskey(ok && isTouchDevice));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep('email');
    setCode('');
    clearFeedback();
  };

  const startReset = () => {
    setReset(true);
    setMode('login');
    setStep('email');
    setCode('');
    clearFeedback();
  };

  const cancelReset = () => {
    setReset(false);
    setStep('email');
    setCode('');
    clearFeedback();
  };

  // After any login: has the customer made a PIN yet?
  const goAfterLogin = async (viaPasskey: boolean) => {
    try {
      const res = await fetch('/api/pin/status', { method: 'POST' });
      const data = await res.json();
      if (!data.hasPin || reset) {
        router.replace('/create-pin');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      router.replace('/dashboard');
    }
    router.refresh();
  };

  const sendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    clearFeedback();

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        // "Log in" never creates an account. Only "Create account" does.
        options: { shouldCreateUser: mode === 'signup' },
      });

      if (error) {
        if (mode === 'login' && /signups? not allowed/i.test(error.message)) {
          setError('No account found for this email. Tap "Create account" to sign up.');
          return;
        }
        throw error;
      }

      setEmail(cleanEmail);
      setStep('code');
      setCode('');
      setCooldown(60);
      setMessage(`We sent a code to ${cleanEmail}.`);
    } catch (err: any) {
      setError(err?.message ?? 'Could not send the code. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    clearFeedback();

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
      await goAfterLogin(false);
    } catch (err: any) {
      const text: string = err?.message ?? '';
      setError(
        /expired|invalid/i.test(text)
          ? 'That code is wrong or has expired. Request a new one.'
          : text || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loginWithPasskey = async () => {
    setLoading(true);
    clearFeedback();

    try {
      const auth: any = createClient().auth;
      if (typeof auth.signInWithPasskey !== 'function') throw new Error('unsupported');
      const { error } = await auth.signInWithPasskey();
      if (error) throw error;
      await goAfterLogin(true);
    } catch (err: any) {
      // Technical details stay in the console, the customer only sees a short hint
      console.error('Passkey login failed:', err);
      setMessage('Create your account first.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'email') sendCode();
    else verifyCode();
  };

  const primaryLabel = loading
    ? 'Please wait...'
    : step === 'email'
      ? 'Send code'
      : mode === 'signup'
        ? 'Create account'
        : reset
          ? 'Continue'
          : 'Log in';

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      minHeight: '100dvh',
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '1rem',
      color: '#ffffff',
      backgroundColor: 'transparent'
    }}>
      {/* Title */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
          KNprovider
        </h1>
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.22em', color: '#ffffff', textTransform: 'uppercase', fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.55)' }}>
          Known. Needed. Proven.
        </p>
      </div>

      {/* Transparent dark grey glass box */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'rgba(20, 20, 20, 0.35)',
        border: '1px solid rgba(15, 239, 240, 0.35)',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        boxSizing: 'border-box'
      }}>

        {/* Tabs: only on the first step, and not when resetting a PIN */}
        {step === 'email' && !reset && (
          <div className="tabs-turq" style={{
            display: 'flex',
            borderRadius: '0.85rem',
            padding: '0.25rem',
            marginBottom: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: mode === 'login' ? '1px solid rgba(15, 239, 240, 0.45)' : '1px solid transparent',
                background: mode === 'login' ? undefined : 'transparent',
                color: '#ffffff',
                opacity: mode === 'login' ? 1 : 0.6,
              }}
              className={mode === 'login' ? 'btn-metal' : ''}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: mode === 'signup' ? '1px solid rgba(15, 239, 240, 0.45)' : '1px solid transparent',
                background: mode === 'signup' ? undefined : 'transparent',
                color: '#ffffff',
                opacity: mode === 'signup' ? 1 : 0.6,
              }}
              className={mode === 'signup' ? 'btn-metal' : ''}
            >
              Create account
            </button>
          </div>
        )}

        {reset && (
          <div className="step-in" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.2rem', color: '#ffffff' }}>Reset your PIN</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
              {"We'll email you a code, then you choose a new PIN."}
            </p>
          </div>
        )}

        {/* Fast login with Face ID / fingerprint (phones and tablets only) */}
        {step === 'email' && mode === 'login' && !reset && canUsePasskey && (
          <div className="step-in">
            <button
              type="button"
              onClick={loginWithPasskey}
              disabled={loading}
              style={secondaryButtonStyle}
            >
              Log in with Face ID or fingerprint
            </button>
            <p style={{ margin: '1rem 0', textAlign: 'center', fontSize: '0.7rem', color: '#9ca3af' }}>
              or use a code sent to your email
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {step === 'email' ? (
            <div key="email" className="step-in">
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-turq"
                style={inputStyle}
              />
              {mode === 'signup' && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                  {"We'll email you a code to create your account."}
                </p>
              )}
            </div>
          ) : (
            <div key="code" className="step-in">
              <label style={labelStyle}>Code from your email</label>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="field-turq"
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em' }}
              />
            </div>
          )}

          {error && (
            <p className="step-in" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#f87171', margin: 0 }}>
              {error}
            </p>
          )}
          {message && (
            <p className="step-in" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#08ddf0', margin: 0 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (step === 'code' && code.length < 6)}
            className="btn-metal"
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.9rem',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              color: '#ffffff',
              border: '1px solid rgba(15, 239, 240, 0.45)'
            }}
          >
            {primaryLabel}
          </button>

          {step === 'email' && mode === 'login' && (
            <div style={{ textAlign: 'center' }}>
              {reset ? (
                <button type="button" onClick={cancelReset} style={linkButtonStyle}>
                  Back to log in
                </button>
              ) : (
                <button type="button" onClick={startReset} style={linkButtonStyle}>
                  Forgot PIN?
                </button>
              )}
            </div>
          )}

          {step === 'code' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                type="button"
                onClick={sendCode}
                disabled={loading || cooldown > 0}
                style={{ ...linkButtonStyle, opacity: cooldown > 0 ? 0.6 : 1 }}
              >
                {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  clearFeedback();
                }}
                style={linkButtonStyle}
              >
                Use a different email
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
