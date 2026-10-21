'use client';

import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
};

export default function PinBoxes({ value, onChange, length = 4, error = false, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [disabled, error]);

  return (
    <div
      className={`kn-pin${error ? ' is-error' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const active = !disabled && i === value.length;
        return (
          <div key={i} className={`kn-pin__box${active ? ' is-active' : ''}${filled ? ' is-filled' : ''}`}>
            {filled ? <span className="kn-pin__dot" /> : active ? <span className="kn-pin__caret" /> : null}
          </div>
        );
      })}

      {/* One real input handles typing, backspace and paste. Digits only. */}
      <input
        ref={inputRef}
        className="kn-pin__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={length}
        readOnly={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        aria-label="PIN code"
      />

      <style jsx global>{`
        .kn-pin {
          position: relative;
          display: flex;
          justify-content: center;
          gap: 12px;
        }
        .kn-pin__input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          border: 0;
          padding: 0;
          font-size: 16px;
          caret-color: transparent;
          background: transparent;
        }
        .kn-pin__box {
          width: 58px;
          height: 68px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(12, 22, 34, 0.82);
          border: 1.5px solid rgba(15, 239, 240, 0.28);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 20px rgba(0, 0, 0, 0.35);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .kn-pin__box.is-active {
          border-color: #0feff0;
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 4px rgba(15, 239, 240, 0.16),
            0 0 20px rgba(15, 239, 240, 0.35);
        }
        .kn-pin__box.is-filled {
          border-color: rgba(15, 239, 240, 0.6);
        }
        .kn-pin__dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          animation: kn-pop 0.2s ease-out;
        }
        .kn-pin__caret {
          width: 2px;
          height: 26px;
          border-radius: 2px;
          background: #0feff0;
          animation: kn-blink 1s steps(1) infinite;
        }
        .kn-pin.is-error {
          animation: kn-shake 0.4s ease;
        }
        .kn-pin.is-error .kn-pin__box {
          border-color: #ff3b4e;
          box-shadow: 0 0 0 4px rgba(255, 59, 78, 0.14), 0 0 18px rgba(255, 59, 78, 0.4);
        }
        @keyframes kn-pop {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes kn-blink {
          50% { opacity: 0; }
        }
        @keyframes kn-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(3px); }
        }
        @media (max-width: 360px) {
          .kn-pin { gap: 8px; }
          .kn-pin__box { width: 52px; height: 62px; border-radius: 18px; }
        }
      `}</style>
    </div>
  );
}
