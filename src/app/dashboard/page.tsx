'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { biometricsAvailable, passkeyEnabled, passkeyDismissed } from '@/lib/passkey';
import SwipeToSend from '@/components/SwipeToSend';
import PinBoxes from '@/components/PinBoxes';

interface Transaction {
  id: string;
  recipient_phone: string;
  amount: number;
  status: 'COMPLETED' | 'DECLINED';
  created_at: string;
  local?: boolean;
}

type SendStatus = 'idle' | 'declined' | 'success';

type Recipient = {
  name: string; // the display name the recipient chose
  phone: string; // +4512345678 (used when sending)
  display: string; // +45 12 34 56 78 (shown to the sender)
};

const GLASS: CSSProperties = {
  backgroundColor: 'rgba(20, 20, 20, 0.35)',
  border: '1px solid rgba(15, 239, 240, 0.35)',
  boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
};

const COL: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const LABEL: CSSProperties = { display: 'block', fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.1em' };
const INPUT: CSSProperties = { width: '100%', padding: '0.85rem 1rem', borderRadius: '1rem', backgroundColor: 'rgba(10, 10, 10, 0.55)', color: '#ffffff', border: '1px solid rgba(15, 239, 240, 0.35)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' };
const FACEID: CSSProperties = { width: '100%', maxWidth: '220px', padding: '0.75rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', color: '#ffffff', background: 'rgba(15, 239, 240, 0.08)', border: '1px solid rgba(15, 239, 240, 0.45)' };
const ERR: CSSProperties = { color: '#ef4444', fontSize: '0.7rem', margin: 0, textAlign: 'center' };
const MINI: CSSProperties = { backgroundColor: 'rgba(10, 10, 10, 0.45)', border: '1px solid rgba(15, 239, 240, 0.35)', borderRadius: '1rem', padding: '0.85rem' };
const MINI_LABEL: CSSProperties = { fontSize: '0.55rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', display: 'block' };
const BACK: CSSProperties = { background: 'none', border: 'none', color: '#0feff0', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' };
const EMPTY: CSSProperties = { fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center', margin: '0.5rem 0' };
const PROVIDED: CSSProperties = { margin: '1.1rem 0 0 0', textAlign: 'center', fontSize: '0.55rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(15, 239, 240, 0.55)' };
const SIGNOUT: CSSProperties = { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' };
const tabStyle = (active: boolean): CSSProperties => ({ backgroundColor: active ? '#000000' : 'transparent', color: active ? '#0feff0' : '#4b5563', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.75rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' });
const navStyle = (active: boolean): CSSProperties => ({ background: 'none', border: 'none', color: active ? '#0feff0' : '#9ca3af', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' });

const ProvidedBy = () => <p style={PROVIDED}>Provided by KN</p>;

// "Send to Simon Jensen" with the full number in small text underneath
const RecipientLine = ({ name, phone, center }: { name: string; phone: string; center?: boolean }) => (
  <div style={{ textAlign: center ? 'center' : 'left' }}>
    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Send to {name}</p>
    <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: '#9ca3af' }}>{phone}</p>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTabDesktop, setActiveTabDesktop] = useState<'overview' | 'history'>('overview');
  const [activeTabMobile, setActiveTabMobile] = useState<'home' | 'payments' | 'profile'>('home');

  // 1: Phone, 2: Amount, 3: Swipe, then PIN before the money is sent
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phoneInput, setPhoneInput] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [userCurrency, setUserCurrency] = useState('DKK');

  const [awaitingPin, setAwaitingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [swipeKey, setSwipeKey] = useState(0);
  const [canEnablePasskey, setCanEnablePasskey] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Failed to load history:', error);

      const fetched = ((data ?? []) as Transaction[]).filter(
        (t) => t.status === 'COMPLETED' || t.status === 'DECLINED'
      );
      setTransactions((prev) => {
        const ids = new Set(fetched.map((t) => t.id));
        const localOnly = prev.filter((t) => t.local && !ids.has(t.id));
        return [...localOnly, ...fetched].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [supabase]);

  // Load history + realtime updates
  useEffect(() => {
    const locale = navigator.language;
    setUserCurrency(locale.includes('DK') || locale.includes('da') ? 'DKK' : 'EUR');

    // Face ID / fingerprint is only offered on phones and tablets that have it
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    biometricsAvailable().then((ok) => {
      const usable = ok && isTouchDevice;
      setCanEnablePasskey(usable && !passkeyEnabled());
      // First time on a device with Face ID / fingerprint: offer to turn it on
      if (usable && !passkeyEnabled() && !passkeyDismissed()) router.replace('/enable-passkey');
    });

    loadTransactions();
    const channel = supabase
      .channel('transactions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadTransactions())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadTransactions, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const resetPinState = () => {
    setAwaitingPin(false);
    setPinInput('');
    setPinError('');
    setPinBusy(false);
  };

  const goBack = () => {
    resetPinState();
    setSendStatus('idle');
    setTransferError('');
    setSwipeKey((k) => k + 1);
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  };

  // Step 1: the number must belong to a KNprovider user
  const handleProceedToAmount = async () => {
    const typed = phoneInput.trim();
    if (!typed.startsWith('+')) {
      setTransferError('Enter country code, for example +45.');
      return;
    }

    setCheckingRecipient(true);
    setTransferError('');
    try {
      const res = await fetch('/api/recipient/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: typed }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 400) {
        setTransferError('Enter a valid phone number.');
        return;
      }
      if (!res.ok) throw new Error('lookup_failed');

      if (!data.found) {
        setTransferError('This number is not provided by KN');
        return;
      }
      if (data.self) {
        setTransferError('You cannot send money to yourself.');
        return;
      }

      setRecipient({ name: data.displayName, phone: data.phone, display: data.phoneDisplay });
      setStep(2);
    } catch {
      setTransferError('Could not check the number. Try again.');
    } finally {
      setCheckingRecipient(false);
    }
  };

  const goToSwipe = () => {
    if (!amountInput || Number(amountInput) <= 0) {
      setTransferError('Enter a valid amount.');
      return;
    }
    setTransferError('');
    resetPinState();
    setSendStatus('idle');
    setSwipeKey((k) => k + 1);
    setStep(3);
  };

  // The customer swiped: now ask for the 4-digit PIN before anything is sent
  const handleSwipeConfirm = () => {
    setPinInput('');
    setPinError('');
    setAwaitingPin(true);
  };

  const cancelPin = () => {
    resetPinState();
    setSwipeKey((k) => k + 1); // swipe bar goes back to the start
  };

  const executeTransfer = async (pin: string) => {
    setTransferLoading(true);
    setTransferError('');
    setSendStatus('idle');
    setAwaitingPin(false);
    try {
      const res = await fetch('/api/bank-transfer/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: recipient?.phone ?? phoneInput, amount: amountInput, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Transfer declined');

      setSendStatus('success');
      loadTransactions();

      setTimeout(() => {
        setStep(1);
        setPhoneInput('');
        setRecipient(null);
        setAmountInput('');
        setPinInput('');
        setSendStatus('idle');
      }, 3000);
    } catch (err) {
      // Shown only in the console, never to the user
      console.error('Transfer declined:', err);
      setSendStatus('declined');
      setSwipeKey((k) => k + 1);
      setTransactions((prev) => [
        {
          id: `tx_declined_${Date.now()}`,
          recipient_phone: recipient?.phone ?? (phoneInput || 'Unknown'),
          amount: -Number(amountInput || 0),
          status: 'DECLINED',
          created_at: new Date().toISOString(),
          local: true,
        },
        ...prev,
      ]);
    } finally {
      setTransferLoading(false);
    }
  };

  // Check the PIN first. A wrong PIN does not count as a declined transfer.
  const confirmPin = async (pin: string) => {
    setPinBusy(true);
    setPinError('');
    try {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 423 || data.error === 'no_session') {
        router.replace('/login');
        router.refresh();
        return;
      }
      if (!res.ok) {
        setPinInput('');
        setPinError(
          data.error === 'wrong_pin' && typeof data.remaining === 'number'
            ? `Wrong PIN. ${data.remaining} ${data.remaining === 1 ? 'try' : 'tries'} left.`
            : 'Could not check your PIN. Try again.'
        );
        return;
      }

      await executeTransfer(pin);
    } catch {
      setPinInput('');
      setPinError('Could not check your PIN. Try again.');
    } finally {
      setPinBusy(false);
    }
  };

  const handlePinChange = (v: string) => {
    setPinInput(v);
    setPinError('');
    if (v.length === 4) confirmPin(v);
  };

  const totalSent = transactions
    .filter((t) => t.amount < 0 && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalReceived = transactions
    .filter((t) => t.amount > 0 && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + t.amount, 0);

  const renderHistory = (maxHeight: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight, overflowY: 'auto' }}>
      {loadingHistory ? (
        <p style={EMPTY}>Loading history...</p>
      ) : transactions.length === 0 ? (
        <p style={EMPTY}>No transactions yet.</p>
      ) : (
        transactions.map((tx) => (
          <div key={tx.id} style={{ backgroundColor: 'rgba(10, 10, 10, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '0.85rem', padding: '0.75rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#ffffff', display: 'block' }}>Transfer</span>
              <span style={{ fontSize: '0.6rem', color: '#9ca3af' }}>{tx.recipient_phone}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: tx.status === 'COMPLETED' ? '#0feff0' : '#f87171', display: 'block' }}>
                {tx.amount < 0 ? `-${Math.abs(tx.amount).toFixed(2)}` : `+${tx.amount.toFixed(2)}`}
              </span>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: tx.status === 'COMPLETED' ? '#0feff0' : '#f87171' }}>
                {tx.status === 'COMPLETED' ? 'Completed' : 'Declined'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Steps are shared by desktop and mobile
  const renderStep = () => (
    <>
      {step === 1 && (
        <div style={COL}>
          <div>
            <label style={LABEL}>Recipient phone number</label>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              placeholder="+45 00 00 00 00"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value.replace(/[^\d+\s]/g, ''));
                setTransferError('');
              }}
              style={INPUT}
            />
          </div>
          {transferError && <p style={ERR}>{transferError}</p>}
          <button onClick={handleProceedToAmount} disabled={checkingRecipient} className="btn-metal w-full py-3 text-xs cursor-pointer shadow-lg" style={{ borderRadius: '1rem' }}>
            {checkingRecipient ? 'Verifying...' : 'Continue to amount'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={COL}>
          <div>
            {recipient && (
              <div style={{ marginBottom: '0.9rem' }}>
                <RecipientLine name={recipient.name} phone={recipient.display} />
              </div>
            )}
            <label style={LABEL}>Enter amount ({userCurrency})</label>
            <div style={{ position: 'relative' }}>
              <input type="number" inputMode="decimal" autoFocus placeholder="0.00" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} style={{ ...INPUT, fontSize: '1.1rem', fontWeight: 'bold' }} />
              <span style={{ position: 'absolute', right: '1rem', top: '0.9rem', color: '#0feff0', fontWeight: 'bold', fontSize: '0.85rem' }}>{userCurrency}</span>
            </div>
          </div>
          {transferError && <p style={ERR}>{transferError}</p>}
          <button onClick={goToSwipe} className="btn-metal w-full py-3 text-xs cursor-pointer shadow-lg" style={{ borderRadius: '1rem' }}>
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={COL}>
          <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(15, 239, 240, 0.15)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ready to send</span>
            <h3 style={{ fontSize: '1.4rem', color: '#0feff0', margin: '0.1rem 0 0.5rem', fontWeight: 800 }}>{amountInput} {userCurrency}</h3>
            {recipient ? (
              <RecipientLine name={recipient.name} phone={recipient.display} center />
            ) : (
              <p style={{ fontSize: '0.75rem', color: '#ffffff', margin: 0 }}>To: {phoneInput}</p>
            )}
          </div>

          {/* Only the swipe bar glows red/green */}
          <SwipeToSend
            key={swipeKey}
            onConfirm={handleSwipeConfirm}
            disabled={transferLoading || sendStatus === 'success'}
            status={sendStatus}
          />

          {/* After the swipe: confirm with the 4-digit PIN before the money is sent */}
          {awaitingPin && sendStatus === 'idle' && (
            <div style={{ ...COL, alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Enter your PIN to send</p>
              <PinBoxes value={pinInput} onChange={handlePinChange} error={!!pinError} disabled={pinBusy || transferLoading} />
              {pinError && <p style={ERR}>{pinError}</p>}
              <button type="button" onClick={cancelPin} disabled={pinBusy} style={BACK}>Cancel</button>
            </div>
          )}

          {/* Empty on decline, "Provided by KN" on success */}
          <div style={{ minHeight: '1.2rem' }}>{sendStatus === 'success' && <ProvidedBy />}</div>
        </div>
      )}

      {step < 3 && <ProvidedBy />}
    </>
  );

  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          overscroll-behavior: none;
          background-color: transparent;
        }
        .desktop-layout { display: none; }
        .mobile-layout { display: flex; }
        @media (min-width: 768px) {
          .desktop-layout { display: flex; }
          .mobile-layout { display: none; }
        }
      `}</style>

      {/* ================= DESKTOP ================= */}
      <div className="desktop-layout" style={{ position: 'relative', zIndex: 10, height: '100vh', width: '100vw', flexDirection: 'column', padding: '1.5rem 2.5rem', backgroundColor: 'transparent', boxSizing: 'border-box', overflow: 'hidden', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(15, 239, 240, 0.2)', paddingBottom: '0.75rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.1rem 0', fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>KNprovider</h1>
            <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 500, color: '#0feff0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Provider Control Center</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#ffffff', padding: '0.3rem', borderRadius: '1rem' }}>
              <button type="button" onClick={() => setActiveTabDesktop('overview')} style={tabStyle(activeTabDesktop === 'overview')}>Overview</button>
              <button type="button" onClick={() => setActiveTabDesktop('history')} style={tabStyle(activeTabDesktop === 'history')}>Transfer History</button>
            </div>
            <button type="button" onClick={handleSignOut} style={{ ...SIGNOUT, padding: '0.45rem 1rem', borderRadius: '0.85rem', fontSize: '0.7rem', fontWeight: 600 }}>Sign Out</button>
          </div>
        </div>

        {activeTabDesktop === 'overview' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ ...GLASS, borderRadius: '1.75rem', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Instant Peer Transfer</h2>
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.1rem 0 0 0' }}>Step {step} of 3</p>
                  </div>
                  {step > 1 && <button type="button" onClick={goBack} style={BACK}>Back</button>}
                </div>
                {renderStep()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <div style={MINI}>
                  <span style={MINI_LABEL}>Account Status</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0feff0' }}>Verified &amp; Active</span>
                </div>
                <div style={MINI}>
                  <span style={MINI_LABEL}>Currency</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>Auto ({userCurrency})</span>
                </div>
              </div>
            </div>

            <div style={{ ...GLASS, borderRadius: '1.75rem', padding: '2rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem' }}>History</h3>
              {renderHistory('340px')}
            </div>
          </div>
        ) : (
          <div style={{ ...GLASS, borderRadius: '1.75rem', padding: '2rem', width: '100%', maxWidth: '1100px', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Transfer History</h3>
              <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                Sent <b style={{ color: '#f87171' }}>-{totalSent.toFixed(2)}</b> · Received <b style={{ color: '#0feff0' }}>+{totalReceived.toFixed(2)}</b>
              </span>
            </div>
            {renderHistory('55vh')}
          </div>
        )}
      </div>

      {/* ================= MOBILE ================= */}
      <div className="mobile-layout" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, flexDirection: 'column', padding: '1.2rem 1.2rem 4.5rem 1.2rem', backgroundColor: 'transparent', boxSizing: 'border-box', alignItems: 'center', overflow: 'hidden', touchAction: 'pan-y' }}>
        <div style={{ width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(15, 239, 240, 0.2)' }}>
          <div>
            <h1 style={{ margin: '0 0 0.1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>KNprovider</h1>
            <p style={{ margin: 0, fontSize: '0.55rem', color: '#0feff0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Provided by KN</p>
          </div>
          <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.55)', border: '1px solid rgba(15, 239, 240, 0.3)', padding: '0.3rem 0.7rem', borderRadius: '1rem', fontSize: '0.65rem', color: '#0feff0', fontWeight: 600 }}>Active</div>
        </div>

        <div style={{ width: '100%', maxWidth: '450px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {activeTabMobile === 'home' && (
            <div style={{ ...GLASS, borderRadius: '1.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Send money</h2>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.1rem 0 0 0' }}>Step {step} of 3</p>
                </div>
                {step > 1 && <button type="button" onClick={goBack} style={BACK}>Back</button>}
              </div>
              {renderStep()}
            </div>
          )}

          {activeTabMobile === 'payments' && (
            <div style={{ ...GLASS, borderRadius: '1.5rem', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Payments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', margin: '0.8rem 0' }}>
                <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.55)', borderRadius: '0.85rem', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.55rem', color: '#9ca3af' }}>Sent</span>
                  <p style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>-{totalSent.toFixed(2)}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(10, 10, 10, 0.55)', borderRadius: '0.85rem', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.55rem', color: '#9ca3af' }}>Received</span>
                  <p style={{ color: '#0feff0', fontWeight: 'bold', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>+{totalReceived.toFixed(2)}</p>
                </div>
              </div>
              {renderHistory('40vh')}
            </div>
          )}

          {activeTabMobile === 'profile' && (
            <div style={{ ...GLASS, borderRadius: '1.5rem', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>Profile</h2>
              {canEnablePasskey && (
                <button type="button" onClick={() => router.push('/enable-passkey')} style={{ ...FACEID, maxWidth: '100%', marginTop: '0.85rem' }}>
                  Turn on Face ID or fingerprint
                </button>
              )}
              <button type="button" onClick={handleSignOut} style={{ ...SIGNOUT, padding: '0.65rem', borderRadius: '0.85rem', width: '100%', marginTop: '0.85rem', fontSize: '0.75rem' }}>Sign Out</button>
            </div>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(8, 8, 8, 0.95)', borderTop: '1px solid rgba(15, 239, 240, 0.2)', display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0', backdropFilter: 'blur(20px)', zIndex: 100 }}>
          {([['home', 'Home'], ['payments', 'Payments'], ['profile', 'Profile']] as const).map(([key, label]) => (
            <button type="button" key={key} onClick={() => setActiveTabMobile(key)} style={navStyle(activeTabMobile === key)}>{label}</button>
          ))}
        </div>
      </div>
    </>
  );
}
