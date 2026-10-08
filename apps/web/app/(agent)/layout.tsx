import Link from 'next/link';

import { requirePageRole } from '@/lib/session';

const BOTTOM_NAV = [
  { href: '/agent', label: 'Today', active: true },
  { href: null, label: 'Collection', active: false },
  { href: null, label: 'Profile', active: false },
] as const;

export default async function AgentLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await requirePageRole('collection_agent');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-5">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-base font-bold">
            GebeyaLink
          </Link>
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-ink-faint uppercase">
            Field collection
          </span>
        </div>
        <span className="max-w-[12rem] truncate rounded-pill border border-line bg-paper px-3 py-1 font-mono text-[0.6875rem] text-ink-soft">
          {session.user.email}
        </span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-line bg-surface">
        {BOTTOM_NAV.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current="page"
              className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-accent"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              aria-disabled
              className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-ink-faint"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              {item.label}
            </span>
          ),
        )}
      </nav>
    </div>
  );
}
