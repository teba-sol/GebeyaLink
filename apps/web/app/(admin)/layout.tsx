import Link from 'next/link';

import { requirePageRole } from '@/lib/session';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/cooperatives', label: 'Cooperatives' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/orders', label: 'Orders' },
] as const;

export default async function AdminLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await requirePageRole('admin');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[var(--container-page)] items-center gap-6 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight"
            >
              GebeyaLink
            </Link>
            <span className="rounded-pill border border-line bg-surface px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold tracking-[0.12em] text-ink-soft uppercase">
              Admin
            </span>
          </div>
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
          <span className="ml-auto max-w-[14rem] truncate rounded-pill border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink-soft">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[var(--container-page)] flex-1 px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
