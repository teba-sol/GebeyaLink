import Link from 'next/link';

import { getCoopContext, listCoopInventory, listCoopOrders } from '@/features/coop/queries';
import { OrderCard } from '@/features/coop/components/order-card';
import { getProductCatalog, productName } from '@/features/marketplace/queries';
import { Card, Eyebrow, Quantity } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

function Stat({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-1.5">
      <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
        {label}
      </p>
      <p className="font-display text-3xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 font-mono text-sm text-ink-soft">{unit}</span> : null}
      </p>
      <p className="text-xs text-ink-soft">{caption}</p>
    </Card>
  );
}

export default async function OpsOverviewPage() {
  const session = await requirePageRole('cooperative_staff');

  const [coops, inventory, orders, catalog] = await Promise.all([
    getCoopContext(session),
    listCoopInventory(session, { page: 1, limit: 200 }),
    listCoopOrders(session, { page: 1, limit: 200 }),
    getProductCatalog(session),
  ]);

  const lots = inventory.items;
  const availableKg = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);
  const sellable = lots.filter((lot) => lot.availableQuantity >= 0.001);
  const activeListings = lots.filter((lot) => lot.listing?.status === 'active').length;

  const pending = orders.items
    .filter((o) => o.status === 'PENDING')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const awaitingPayment = orders.items.filter(
    (o) => o.status === 'ACCEPTED' && o.paymentStatus === 'PENDING',
  );
  const pendingKg = pending.reduce((sum, o) => sum + o.quantity, 0);
  const pendingAwaitingKg = awaitingPayment.reduce((sum, o) => sum + o.quantity, 0);

  const coopName = coops.map((c) => c.name).join(', ') || 'Your cooperative';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · overview</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Operations</h1>
        <p className="text-sm text-ink-soft">{coopName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Available to sell"
          value={availableKg.toLocaleString('en-US')}
          unit="kg"
          caption={`Across ${sellable.length} sellable lot${sellable.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Needs response"
          value={String(pending.length)}
          unit={pending.length === 1 ? 'order' : 'orders'}
          caption={`${pendingKg.toLocaleString('en-US')} kg reserved in the response window`}
        />
        <Stat
          label="Awaiting payment"
          value={String(awaitingPayment.length)}
          unit={awaitingPayment.length === 1 ? 'order' : 'orders'}
          caption={`${pendingAwaitingKg.toLocaleString('en-US')} kg committed`}
        />
        <Stat
          label="Active listings"
          value={String(activeListings)}
          unit={activeListings === 1 ? 'listing' : 'listings'}
          caption="Public on the buyer marketplace"
        />
      </div>

      {pending.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Orders needing a response</h2>
            <Link href="/ops/orders" className="text-xs font-medium text-ink-soft hover:text-ink">
              View all incoming orders →
            </Link>
          </div>
          {pending.slice(0, 5).map((order) => (
            <OrderCard key={order.id} order={order} productName={productName(catalog, order.productId)} />
          ))}
        </section>
      ) : (
        <Card padding="md" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">No orders awaiting a response</h2>
              <p className="text-sm text-ink-soft">
                Reserve stock is held only while the response window is open.
              </p>
            </div>
            <Link
              href="/ops/inventory"
              className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
            >
              Review inventory & listings
            </Link>
          </div>
        </Card>
      )}

      {awaitingPayment.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Payment awaiting verification</h2>
            <Link href="/ops/orders?tab=awaiting" className="text-xs font-medium text-ink-soft hover:text-ink">
              Open payment queue →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {awaitingPayment.map((order) => (
              <Card key={order.id} padding="md" className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {productName(catalog, order.productId)}
                  </p>
                  <Quantity value={order.quantity} unit="kg" size="sm" />
                </div>
                <p className="text-xs text-ink-soft">
                  {order.buyerName ?? 'Buyer'} · grade {order.qualityGrade}
                </p>
                <Link
                  href={`/ops/orders/${order.id}`}
                  className="mt-3 inline-flex w-fit items-center rounded-btn border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
                >
                  Verify receipt
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}