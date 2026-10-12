import Link from 'next/link';

import { OrderCard } from '@/features/orders/components/order-card';
import { browseOrders } from '@/features/orders/queries';
import { getProductCatalog, productName } from '@/features/marketplace/queries';
import { requirePageRole } from '@/lib/session';

export default async function BuyerOrdersPage() {
  const session = await requirePageRole('buyer');

  const [catalog, orders] = await Promise.all([
    getProductCatalog(session),
    browseOrders(session, { page: 1, limit: 20 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Buyer · your orders
        </p>
        <h1 className="font-display text-4xl font-semibold">Orders</h1>
        <p className="text-ink-soft">
          Every order you have placed, from reservation through payment.
        </p>
      </header>

      {orders.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">No orders yet</p>
          <p className="max-w-[44ch] text-sm text-ink-soft">
            Browse the marketplace and reserve stock — your order journey will
            appear here the moment it is placed.
          </p>
          <Link
            href="/marketplace"
            className="rounded-btn border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="listing-grid">
          {orders.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              name={productName(catalog, order.productId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}