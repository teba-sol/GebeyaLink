'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/transport', label: 'Runsheet' },
  { href: '/transport/history', label: 'History' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/transport') return pathname === '/transport';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Touch bottom nav for the transporter shell. */
export function TransporterNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-line bg-surface">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
              active ? 'text-accent' : 'text-ink-soft'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${active ? 'bg-accent' : 'bg-line-strong'}`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
