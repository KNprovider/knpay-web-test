'use client';

import { useState, useRef } from 'react';

interface SwipeToPayProps {
  amount: number;
  recipient: string;
  onSuccess?: () => void;
}

export default function SwipeToPay({ amount, recipient, onSuccess }: SwipeToPayProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = () => setIsDragging(true);

  const handleEnd = async () => {
    setIsDragging(false);
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const maxDrag = containerWidth - 65;

    // Hvis der swipes mere end 75% mod højre, udløses betalingen
    if (dragX > maxDrag * 0.75) {
      setDragX(maxDrag);
      await executeTransfer();
    } else {
      setDragX(0);
    }
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const maxDrag = containerWidth - 65;

    const currentDrag = clientX - (containerRef.current?.getBoundingClientRect().left || 0);
    if (currentDrag >= 0 && currentDrag <= maxDrag) {
      setDragX(currentDrag);
    }
  };

  const executeTransfer = async () => {
    setLoading(true);

    try {
      // Kalder jeres eksisterende backend-rute
      const res = await fetch('/api/bank-transfer/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, recipient }),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setStatus('success');
        if (onSuccess) onSuccess();
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Betalingen blev afvist af banken');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Kunne ikke forbinde til betalingstjenesten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4">
      <div className="mb-4 text-center">
        <p className="text-xs text-zinc-400">Overførsel</p>
        <h2 className="text-2xl font-bold text-white">{amount} DKK</h2>
        <p className="text-xs text-knpay-accent mt-1">Til: {recipient}</p>
      </div>

      {status === 'success' ? (
        <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/50 p-4 text-center text-emerald-400 font-semibold animate-pulse">
          ✓ Sendt succesfuldt
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl bg-red-500/20 border border-red-500/50 p-4 text-center text-red-400 text-xs">
          ✕ {errorMessage}
          <button 
            onClick={() => { setStatus('idle'); setDragX(0); }}
            className="block mx-auto mt-2 text-xs text-white underline hover:text-knpay-accent"
          >
            Prøv igen
          </button>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="relative h-14 w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-1 overflow-hidden select-none flex items-center"
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 tracking-wider pointer-events-none">
            Swipe for at godkende →
          </span>

          <div
            onTouchStart={handleStart}
            onMouseDown={handleStart}
            style={{ transform: `translateX(${dragX}px)` }}
            className="absolute left-1 h-12 w-14 rounded-xl btn-metal flex items-center justify-center text-white cursor-pointer shadow-lg transition-transform duration-75"
          >
            {loading ? '...' : '⚡'}
          </div>
        </div>
      )}
    </div>
  );
}
