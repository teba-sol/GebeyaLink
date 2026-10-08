import Link from 'next/link';

import { requirePageRole } from '@/lib/session';

const NAV = [
  { href: '/ops', label: 'Overview' },
  { href: '/ops/inventory', label: 'Inventory' },
  { href: '/ops/orders', label: 'Incoming orders' },
] as const;

export default async function CoopLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await requirePageRole('cooperative_staff');

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 flex h-dvh w-60 flex-none flex-col gap-6 border-r border-line bg-surface p-5">
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            GebeyaLink
          </Link>
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-ink-faint uppercase">
            Cooperative ops
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-btn px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
          <span className="truncate font-mono text-[0.6875rem] text-ink-soft">
            {session.user.email}
          </span>
          <span className="text-[0.6875rem] text-ink-faint">
            Cooperative staff
          </span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[var(--container-page)] px-6 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
