'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Pages that have their own navigation (or none at all)
const HIDDEN_ON = ['/onboarding', '/login', '/login-pin', '/create-pin', '/dashboard'];

export default function Navigation() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const navItems = [
    { name: 'BETAL', path: '/payment' },
    { name: 'KORT', path: '/cards' },
    { name: 'HISTORIK', path: '/history' },
    { name: 'PROFIL', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md justify-around py-4 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative flex flex-col items-center px-3 py-1 text-[11px] font-semibold tracking-widest transition-all duration-200 ${
                isActive
                  ? 'text-cyan-400 [text-shadow:0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-[2px] w-5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
