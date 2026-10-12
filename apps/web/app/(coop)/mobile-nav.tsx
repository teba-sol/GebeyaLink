'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { SignOutButton } from '@/features/auth/components/sign-out-button';

const NAV = [
  { href: '/ops', label: 'Overview' },
  { href: '/ops/inventory', label: 'Inventory' },
  { href: '/ops/orders', label: 'Incoming orders' },
  { href: '/ops/people', label: 'Centers & farmers' },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="coop-mobile-nav"
        className="rounded-btn border border-line bg-surface px-3 py-2 text-xs font-medium text-ink lg:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        Menu
      </button>
      {open && (
        <div id="coop-mobile-nav" className="flex flex-col gap-2 border-t border-line bg-paper px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-btn px-3 py-2 text-sm font-medium ${
                  isActive(pathname, item.href)
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-1 border-t border-line pt-3">
            <span className="truncate px-3 font-mono text-xs text-ink-soft">{email}</span>
            <SignOutButton className="rounded-btn px-3 py-2 text-left text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink" />
          </div>
        </div>
      )}
    </>
  );
}