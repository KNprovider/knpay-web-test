'use client';

import { useEffect } from 'react';

// Stops pinch-zoom and sideways dragging of the page on phones.
export default function MobileLock() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener('gesturestart', block);
    document.addEventListener('gesturechange', block);
    document.addEventListener('gestureend', block);
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', block);
      document.removeEventListener('gesturechange', block);
      document.removeEventListener('gestureend', block);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <style jsx global>{`
      html,
      body {
        max-width: 100vw;
        overflow-x: hidden;
        overscroll-behavior: none;
        touch-action: pan-y;
        -webkit-text-size-adjust: 100%;
      }
    `}</style>
  );
}
