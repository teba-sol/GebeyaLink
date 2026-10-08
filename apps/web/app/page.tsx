import Link from 'next/link';

const SHELLS = [
  {
    href: '/marketplace',
    label: 'Marketplace',
    note: 'Buyer discovery — browse and order',
  },
  {
    href: '/ops',
    label: 'Cooperative ops',
    note: 'Inventory, incoming orders, dispatch',
  },
  {
    href: '/agent',
    label: 'Field agent',
    note: 'Collection pick-ups, quantity, handoff',
  },
  {
    href: '/admin',
    label: 'Administration',
    note: 'Cooperatives and platform oversight',
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[var(--container-page)] flex-col gap-12 px-6 py-16 lg:px-10">
      <section className="flex flex-col gap-6">
        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">
          GebeyaLink · F0 foundation
        </p>
        <h1 className="max-w-[24ch] font-display text-5xl leading-[1.04] font-semibold lg:text-6xl">
          Agricultural supply, moved like a marketplace.
        </h1>
        <p className="max-w-[58ch] text-ink-soft">
          B2B commerce and supply-chain operations — buyers, cooperatives, field
          agents and logistics on one platform. The design system is locked;
          role workspaces below are shells awaiting live data in F1.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-btn border border-accent bg-accent px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Explore marketplace
          </Link>
          <Link
            href="/sign-in"
            className="rounded-btn border border-line-strong bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
          >
            Sign in
          </Link>
          <Link
            href="/design-system"
            className="rounded-btn px-5 py-3 text-sm font-medium text-ink-soft hover:bg-surface-2"
          >
            Design system →
          </Link>
        </div>
      </section>

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