import Link from 'next/link';

import { restrictToRole } from '@/lib/session';

const NAV = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/orders', label: 'Orders' },
  { href: '/account', label: 'Account' },
] as const;

export default async function BuyerLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await restrictToRole('buyer');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[var(--container-page)] items-center gap-6 px-6 lg:px-10">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            GebeyaLink
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-btn px-3 py-2 font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {session ? (
              <span className="max-w-[14rem] truncate rounded-pill border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink-soft">
                {session.user.email}
              </span>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-btn border border-accent bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[var(--container-page)] flex-1 px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
