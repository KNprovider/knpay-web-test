'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (v: string) => {
  let d = v.replace(/\D/g, '');
  // Autofill can give MMYYYY: turn it into MMYY
  if (d.length === 6) d = d.slice(0, 2) + d.slice(4);
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function PaymentPage() {
  const router = useRouter();
  const cardInputRef = useRef<HTMLInputElement>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1));
  }, []);

  // A website cannot open the phone's wallet without the Apple/Google payment APIs.
  // This opens the card field so the phone offers saved cards / Scan Card.
  const handleExpressWalletClick = () => {
    setShowHint(true);
    const el = cardInputRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  const handleGembaPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/gemba/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderName, cardNumber, expiry, cvc }),
      });

      if (!response.ok) {
        throw new Error('Payment authorization failed via Gemba API.');
      }

      router.push('/dashboard');
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred during payment processing.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'transparent',
      boxSizing: 'border-box'
    }}>
      {/* Header (same style as the login page) */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2.25rem', fontWeight: 800, color: '#D6D0B7', letterSpacing: '0.06em', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          KNprovider
        </h1>
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.22em', color: '#D6D0B7', textTransform: 'uppercase', fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
          Known. Needed. Proven.
        </p>
      </div>

      {/* Transparent dark grey glass box (same as login) */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'rgba(20, 20, 20, 0.35)',
        border: '1px solid rgba(15, 239, 240, 0.35)',
        borderRadius: '1.25rem',
        padding: '2.25rem 2rem',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        boxSizing: 'border-box'
      }}>
        <h2 style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#ffffff',
          marginBottom: '1.25rem',
          letterSpacing: '0.12em',
          textAlign: 'center',
          opacity: 0.9
        }}>
          Payment Method
        </h2>

        {/* Express button: opens the card field so the phone offers saved cards / Scan Card */}
        <button
          type="button"
          onClick={handleExpressWalletClick}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '0.85rem',
            borderRadius: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.25)',
            marginBottom: showHint ? '0.6rem' : '1.25rem',
            transition: 'transform 0.15s ease, opacity 0.15s ease'
          }}
        >
          <span>Apple Pay / Google Wallet Express</span>
        </button>

        {showHint && (
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.65rem', lineHeight: 1.5, color: '#9ca3af', textAlign: 'center' }}>
            {isIOS
              ? 'Tap the card number field and choose a saved card above the keyboard, or tap “Scan Card” to use the camera.'
              : 'Tap the card number field and choose one of your saved cards.'}
          </p>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR ENTER CARD MANUALLY</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Card form */}
        <form onSubmit={handleGembaPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
              Cardholder Name
            </label>
            <input
              type="text"
              required
              name="ccname"
              autoComplete="cc-name"
              autoCapitalize="words"
              autoCorrect="off"
              placeholder="John Doe"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="field-turq w-full px-4 py-3 text-sm"
              style={{ borderRadius: '1rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
              Card Number
            </label>
            <input
              ref={cardInputRef}
              type="text"
              required
              name="cardnumber"
              autoComplete="cc-number"
              inputMode="numeric"
              maxLength={23}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="field-turq w-full px-4 py-3 text-sm"
              style={{ borderRadius: '1rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
                Expiry Date
              </label>
              <input
                type="text"
                required
                name="cc-exp"
                autoComplete="cc-exp"
                inputMode="numeric"
                maxLength={7}
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="field-turq w-full px-4 py-3 text-sm text-center"
                style={{ borderRadius: '1rem' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
                CVC / CVC2
              </label>
              <input
                type="password"
                required
                name="cvc"
                autoComplete="cc-csc"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="•••"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="field-turq w-full px-4 py-3 text-sm text-center"
                style={{ borderRadius: '1rem' }}
              />
            </div>
          </div>

          {errorMessage && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', margin: '0.2rem 0 0 0' }}>
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-metal w-full py-3.5 text-sm cursor-pointer shadow-lg mt-2"
            style={{ borderRadius: '1rem' }}
          >
            {loading ? 'Authorizing via Gemba...' : 'Complete Registration →'}
          </button>
        </form>
      </div>
    </div>
  );
}
