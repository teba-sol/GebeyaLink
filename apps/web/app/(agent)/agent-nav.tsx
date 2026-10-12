'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/agent', label: 'Today' },
  { href: '/agent/new', label: 'Record' },
  { href: '/agent/deliveries', label: 'History' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/agent') return pathname === '/agent';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Touch bottom nav for the collection agent shell. */
export function AgentNav() {
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