import Link from 'next/link';

import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getPageSession } from '@/lib/session';

const SHELLS = [
  {
    href: '/marketplace',
    label: 'Marketplace',
    note: 'Browse live lots, reserve stock, order',
  },
  {
    href: '/ops',
    label: 'Cooperative ops',
    note: 'Incoming orders, inventory, payments',
  },
  {
    href: '/agent',
    label: 'Field agent',
    note: 'Collection pick-ups and intake',
  },
  {
    href: '/admin',
    label: 'Administration',
    note: 'Cooperatives and platform oversight',
  },
] as const;

export default async function Home() {
  const session = await getPageSession();
  const awaitingRole = session && !session.role;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[var(--container-page)] flex-col gap-12 px-6 py-16 lg:px-10">
      <section className="flex flex-col gap-6">
        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">
          GebeyaLink · buyer journey live
        </p>
        <h1 className="max-w-[24ch] font-display text-5xl leading-[1.04] font-semibold lg:text-6xl">
          Agricultural supply, moved like a marketplace.
        </h1>
        <p className="max-w-[58ch] text-ink-soft">
          B2B commerce and supply-chain operations — buyers, cooperatives,
          field agents and logistics on one platform. The marketplace is live:
          browse graded inventory, reserve stock, and follow every order to
          payment.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-btn border border-accent bg-accent px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Explore marketplace
          </Link>
          {session ? (
            session.role ? (
              <Link
                href={session.role === 'buyer' ? '/marketplace' : session.role === 'cooperative_staff' ? '/ops' : session.role === 'collection_agent' ? '/agent' : '/admin'}
                className="rounded-btn border border-line-strong bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
              >
                Open your workspace
              </Link>
            ) : null
          ) : (
            <Link
              href="/sign-in"
              className="rounded-btn border border-line-strong bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/design-system"
            className="rounded-btn px-5 py-3 text-sm font-medium text-ink-soft hover:bg-surface-2"
          >
            Design system →
          </Link>
        </div>
      </section>

      {awaitingRole ? (
        <section className="flex flex-col gap-3 rounded-card border border-line-strong bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold">
              Account created — register your organization
            </p>
            <p className="text-sm text-ink-soft">
              Register the cooperative, buyer or transporter you represent and
              submit it for verification. An administrator approves it before you
              can trade or operate. Already applied? You are awaiting review.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/onboarding"
              className="rounded-btn border border-accent bg-accent px-4 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Register organization
            </Link>
            <SignOutButton className="rounded-btn border border-line-strong bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2" />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Role workspaces</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SHELLS.map((shell) => (
            <Link
              key={shell.href}
              href={shell.href}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface p-6 shadow-card transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="font-display text-lg font-semibold">
                {shell.label}
              </span>
              <span className="text-sm text-ink-soft">{shell.note}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}