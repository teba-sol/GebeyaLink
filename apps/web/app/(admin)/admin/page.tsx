import Link from 'next/link';

import { getAdminOverview, listAdminVerificationQueue } from '@/features/admin/queries';
import { Eyebrow } from '@/features/ui';
import { formatBirr, formatKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const ORDER_STATUS_SECTIONS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PAYMENT_CONFIRMED', label: 'Payment confirmed' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

export default async function AdminOverviewPage() {
  const session = await requirePageRole('admin');
  const [overview, pendingVerifications] = await Promise.all([
    getAdminOverview(),
    listAdminVerificationQueue(session, { status: 'pending', page: 1, limit: 1 }),
  ]);

  const stats = [
    {
      label: 'Verifications pending',
      value: pendingVerifications.total.toLocaleString('en-US'),
      note: 'organizations awaiting review',
      href: '/admin/verifications',
    },
    {
      label: 'Cooperatives',
      value: overview.cooperatives.total.toLocaleString('en-US'),
      note: `${overview.cooperatives.active} active · ${overview.cooperatives.inactive} inactive`,
      href: '/admin/cooperatives',
    },
    {
      label: 'Registered farmers',
      value: overview.farmers.toLocaleString('en-US'),
      note: 'farmer records across all cooperatives',
      href: null,
    },
    {
      label: 'Collection centers',
      value: overview.centers.toLocaleString('en-US'),
      note: 'active intake points',
      href: null,
    },
    {
      label: 'Recorded deliveries',
      value: overview.deliveries.total.toLocaleString('en-US'),
      note: `${formatKg(overview.deliveries.acceptedKg)} accepted into inventory`,
      href: null,
    },
    {
      label: 'Active listings',
      value: overview.activeListings.toLocaleString('en-US'),
      note: 'live marketplace supply',
      href: null,
    },
    {
      label: 'Confirmed revenue',
      value: formatBirr(overview.confirmedRevenue),
      note: 'across confirmed payments',
      href: null,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · oversight</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Administration</h1>
        <p className="text-sm text-ink-soft">
          Live tallies across the platform — no cached or sample figures.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const inner = (
            <div className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase">
                {stat.label}
              </p>
              <p className="font-mono text-3xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-ink-soft">{stat.note}</p>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="transition-opacity hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={stat.label}>{inner}</div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Orders</h2>
            <p className="text-sm text-ink-soft">
              {overview.orders.total.toLocaleString('en-US')} platform orders by state
            </p>
          </div>
          <Link href="/admin/orders" className="text-sm font-medium text-accent hover:underline">
            All orders →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_SECTIONS.map((section) => {
            const count = overview.orders.byStatus[section.key] ?? 0;
            return (
              <div
                key={section.key}
                className="flex min-w-32 flex-col gap-1 rounded-card border border-line bg-surface px-4 py-3"
              >
                <span className="font-mono text-xl font-semibold tabular-nums">{count}</span>
                <span className="text-xs text-ink-soft">{section.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}