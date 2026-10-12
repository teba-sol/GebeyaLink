import Link from 'next/link';

import { listAdminOrders } from '@/features/admin/queries';
import { Eyebrow, GradeMark, Quantity, StatusMark } from '@/features/ui';
import { formatBirr, formatDateTime, formatPricePerKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'PENDING' as const, label: 'Pending' },
  { value: 'ACCEPTED' as const, label: 'Accepted' },
  { value: 'PAYMENT_CONFIRMED' as const, label: 'Payment confirmed' },
  { value: 'REJECTED' as const, label: 'Rejected' },
  { value: 'EXPIRED' as const, label: 'Expired' },
  { value: 'CANCELLED' as const, label: 'Cancelled' },
];

const PAGE_SIZE = 25;

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await requirePageRole('admin');
  const { status, page } = await props.searchParams;

  const activeStatus = STATUS_FILTERS.some((f) => f.value === status) ? status : null;
  const activePage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const result = await listAdminOrders(session, {
    status: (activeStatus as (typeof STATUS_FILTERS)[number]['value'] | null) ?? undefined,
    page: activePage,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filtersHref = (value: string | null) =>
    value ? `/admin/orders?status=${value}` : '/admin/orders';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · transactions</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Orders</h1>
        <p className="text-sm text-ink-soft">
          {result.total.toLocaleString('en-US')} orders across all cooperatives
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((filter) => {
          const active =
            activeStatus === filter.value || (filter.value === null && !activeStatus);
          return (
            <Link
              key={filter.label}
              href={filtersHref(filter.value)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          {activeStatus ? `No ${activeStatus.toLowerCase().replace(/_/g, ' ')} orders.` : 'No orders yet.'}
        </div>
      ) : (
        <div className="ops-wrap overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="ops-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Cooperative</th>
                <th scope="col">Buyer</th>
                <th scope="col">Product</th>
                <th scope="col">Grade</th>
                <th scope="col" className="text-right">Quantity</th>
                <th scope="col" className="text-right">Value</th>
                <th scope="col">Status</th>
                <th scope="col">Placed</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => (
                <tr key={order.id}>
                  <td className="font-mono text-xs font-semibold">{order.id.slice(0, 8)}</td>
                  <td className="min-w-40">
                    <Link
                      href={`/admin/cooperatives/${order.cooperativeId}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {order.cooperativeName}
                    </Link>
                  </td>
                  <td className="min-w-32 text-ink-soft">{order.buyerName ?? 'Buyer'}</td>
                  <td className="font-medium">{order.productName}</td>
                  <td>
                    <GradeMark grade={order.qualityGrade} size="sm" />
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    <Quantity value={order.quantity} unit="kg" size="sm" />
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    <span title={`${formatPricePerKg(order.unitPrice)}/kg`}>
                      {formatBirr(order.productTotal)}
                    </span>
                  </td>
                  <td>
                    <StatusMark status={order.status} />
                  </td>
                  <td className="min-w-32 font-mono text-xs text-ink-soft">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={`/admin/orders?${new URLSearchParams({
              ...(activeStatus ? { status: activeStatus } : {}),
              page: String(Math.max(1, activePage - 1)),
            })}`}
            aria-disabled={activePage <= 1}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              activePage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Previous
          </Link>
          <span className="font-mono text-xs text-ink-soft">
            Page {activePage} of {totalPages}
          </span>
          <Link
            href={`/admin/orders?${new URLSearchParams({
              ...(activeStatus ? { status: activeStatus } : {}),
              page: String(Math.min(totalPages, activePage + 1)),
            })}`}
            aria-disabled={activePage >= totalPages}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              activePage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}