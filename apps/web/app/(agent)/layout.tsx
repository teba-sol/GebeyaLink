import Link from 'next/link';

import { AgentNav } from '@/app/(agent)/agent-nav';
import { requirePageRole } from '@/lib/session';

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

      <AgentNav />
    </div>
  );
}