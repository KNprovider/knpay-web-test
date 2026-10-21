'use client';

import { useEffect, useRef, useState } from 'react';

const PAD = 4;
const HANDLE_W = 76;
const HANDLE_H = 56;
const EASE = 'cubic-bezier(0.22, 0.8, 0.3, 1)';

type Status = 'idle' | 'declined' | 'success';

const IDLE_FILL = 'linear-gradient(90deg, rgba(6, 126, 146, 0.15), rgba(15, 239, 240, 0.45))';

// Only the text and the outline (border + outer glow) change colour.
// The inside of the bar (fill and handle) stays the same in every state.
const THEME: Record<Status, { text: string; border: string; glow: string }> = {
  idle: {
    text: '#0fefef',
    border: '#2fb4c4',
    glow: '0 0 0 1px rgba(15, 239, 240, 0.08), 0 0 18px rgba(6, 214, 236, 0.25)',
  },
  declined: {
    text: '#ff3b4e',
    border: '#ff3b4e',
    glow: '0 0 0 1px #ff3b4e, 0 0 22px 4px rgba(255, 59, 78, 0.6)',
  },
  success: {
    text: '#22ff88',
    border: '#22ff88',
    glow: '0 0 0 1px #22ff88, 0 0 22px 4px rgba(34, 255, 136, 0.6)',
  },
};

type Props = {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  status?: Status;
  labelDesktop?: string;
  labelTouch?: string;
  handleText?: string;
};

export default function SwipeToSend({
  onConfirm,
  disabled = false,
  status = 'idle',
  labelDesktop = 'Click to send',
  labelTouch = 'Swipe to send',
  handleText = 'Send',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offsetRef = useRef(0);
  const lastPointer = useRef('mouse');
  const busy = useRef(false);
  const animating = useRef(false);

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  }, []);

  const maxOffset = () => {
    const w = trackRef.current?.getBoundingClientRect().width ?? 0;
    return Math.max(0, w - HANDLE_W - PAD * 2);
  };

  const move = (v: number) => {
    offsetRef.current = v;
    setOffset(v);
  };

  const complete = async () => {
    if (busy.current) return;
    busy.current = true;
    setDragging(false);
    move(maxOffset());
    setDone(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      await onConfirm();
    } catch {
      setDone(false);
      busy.current = false;
      move(0);
    }
  };

  const autoSlide = () => {
    if (disabled || busy.current || animating.current) return;
    animating.current = true;
    setDragging(false);
    move(maxOffset());
    window.setTimeout(() => {
      animating.current = false;
      complete();
    }, 600);
  };

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    lastPointer.current = e.pointerType;
    if (disabled || busy.current || animating.current || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startOffset.current = offsetRef.current;
    setDragging(true);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = Math.min(maxOffset(), Math.max(0, startOffset.current + e.clientX - startX.current));
    move(next);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const max = maxOffset();
    if (max > 0 && offsetRef.current >= max * 0.92) complete();
    else move(0);
  };

  const max = maxOffset();
  const progress = max > 0 ? offset / max : 0;
  const transition = dragging ? 'none' : `transform 0.6s ${EASE}`;
  const theme = THEME[status];

  const label =
    status === 'declined'
      ? 'Declined'
      : status === 'success'
      ? 'Successful'
      : done
      ? 'Sending…'
      : isTouch
      ? `${labelTouch} →`
      : labelDesktop;

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={labelDesktop}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onClick={() => {
        if (lastPointer.current === 'mouse') autoSlide();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          autoSlide();
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: HANDLE_H + PAD * 2,
        borderRadius: '1.25rem',
        border: `1.5px solid ${theme.border}`,
        background: 'rgba(14, 18, 24, 0.5)',
        boxShadow: theme.glow,
        transition: 'border-color .4s ease, box-shadow .4s ease',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && status === 'idle' ? 0.5 : 1,
        boxSizing: 'border-box',
      }}
    >
      {/* Turquoise fill behind the handle (same colour in every state) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: offset + HANDLE_W + PAD * 2,
          background: IDLE_FILL,
          transition: dragging ? 'none' : `width 0.6s ${EASE}`,
          pointerEvents: 'none',
        }}
      />

      {/* Text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${HANDLE_W + PAD * 2}px`,
          color: theme.text,
          fontWeight: 800,
          fontSize: '0.8rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: done || status !== 'idle' ? 1 : Math.max(0, 1 - progress * 1.5),
          transition: 'color .3s ease',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* Handle */}
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: 'absolute',
          top: PAD,
          left: PAD,
          width: HANDLE_W,
          height: HANDLE_H,
          transform: `translateX(${offset}px)`,
          transition,
          borderRadius: '1rem',
          background:
            'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 45%, #f3f4f6 55%, #9ca3af 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.45)',
          color: '#1f2937',
          fontWeight: 800,
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'grab',
        }}
      >
        {done || status === 'success' ? '✓' : handleText}
      </div>
    </div>
  );
}
