import Link from 'next/link';

import type { CoopOrderView } from '@/features/coop/queries';
import { getCoopContext, listCoopOrders } from '@/features/coop/queries';
import { OrderCard } from '@/features/coop/components/order-card';
import { getProductCatalog, productName } from '@/features/marketplace/queries';
import { Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

type Tab = 'pending' | 'awaiting' | 'completed' | 'closed';

const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'Needs response' },
  { value: 'awaiting', label: 'Awaiting payment' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function isTab(value: string | undefined): value is Tab {
  return value === 'pending' || value === 'awaiting' || value === 'completed' || value === 'closed';
}

export default async function IncomingOrdersPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requirePageRole('cooperative_staff');
  const { tab: rawTab } = await props.searchParams;
  const tab: Tab = isTab(rawTab) ? rawTab : 'pending';

  const [catalog, coops, all] = await Promise.all([
    getProductCatalog(session),
    getCoopContext(session),
    listCoopOrders(session, { page: 1, limit: 200 }),
  ]);

  const pending = all.items
    .filter((o) => o.status === 'PENDING')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const awaiting = all.items.filter((o) => o.status === 'ACCEPTED');
  const completed = all.items.filter((o) => o.status === 'PAYMENT_CONFIRMED');
  const closed = all.items.filter(
    (o) => o.status === 'REJECTED' || o.status === 'EXPIRED' || o.status === 'CANCELLED',
  );

  const counts: Record<Tab, number> = {
    pending: pending.length,
    awaiting: awaiting.length,
    completed: completed.length,
    closed: closed.length,
  };
  const visible: CoopOrderView[] =
    tab === 'pending'
      ? pending
      : tab === 'awaiting'
        ? awaiting
        : tab === 'completed'
          ? completed
          : closed;

  const coopNames = coops.map((c) => c.name).join(', ') || 'Your cooperative';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · fulfillment</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Incoming orders</h1>
        <p className="text-sm text-ink-soft">
          {coopNames} — respond to orders within their window, then verify payments.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Order queue">
        {TABS.map((option) => (
          <Link
            key={option.value}
            href={option.value === 'pending' ? '/ops/orders' : `/ops/orders?tab=${option.value}`}
            aria-current={tab === option.value ? 'page' : undefined}
            className={`inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-medium transition-colors ${
              tab === option.value
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
            }`}
          >
            {option.label}
            <span className="font-mono">{counts[option.value]}</span>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          {tab === 'pending'
            ? 'No orders awaiting a response. New buyer orders appear here.'
            : tab === 'awaiting'
              ? 'No orders waiting on payment.'
              : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              productName={productName(catalog, order.productId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}