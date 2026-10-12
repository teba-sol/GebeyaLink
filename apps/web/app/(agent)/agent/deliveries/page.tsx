import Link from 'next/link';

import { listAgentDeliveries } from '@/features/agent/queries';
import { DeliveryStatusMark } from '@/features/agent/components/delivery-status';
import { Eyebrow, GradeMark, Quantity } from '@/features/ui';
import { formatDate } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const FILTERS = [
  { value: null, label: 'All' },
  { value: 'ACCEPTED' as const, label: 'Accepted' },
  { value: 'REJECTED' as const, label: 'Rejected' },
];

const PAGE_SIZE = 20;

export default async function AgentHistoryPage(props: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await requirePageRole('collection_agent');
  const { status, page } = await props.searchParams;

  const activeStatus = FILTERS.some((f) => f.value === status) ? status : null;
  const activePage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const result = await listAgentDeliveries(session, {
    status: (activeStatus as 'ACCEPTED' | 'REJECTED' | undefined) ?? undefined,
    page: activePage,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filtersHref = (value: string | null) =>
    value ? `/agent/deliveries?status=${value}` : '/agent/deliveries';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Eyebrow>Collection agent · history</Eyebrow>
        <h1 className="font-display text-3xl font-semibold">Recorded deliveries</h1>
        <p className="text-sm text-ink-soft">
          {result.total.toLocaleString('en-US')} recordings
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filtersHref(filter.value)}
            aria-current={activeStatus === filter.value || (filter.value === null && !activeStatus) ? 'page' : undefined}
            className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeStatus === filter.value || (filter.value === null && !activeStatus)
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          {activeStatus
            ? `No ${activeStatus.toLowerCase()} deliveries yet.`
            : 'No deliveries recorded yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {result.items.map((delivery) => (
            <Link
              key={delivery.id}
              href={`/agent/deliveries/${delivery.id}`}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GradeMark grade={delivery.qualityGrade} size="sm" />
                  <span className="text-sm font-semibold">{delivery.farmerName ?? 'Farmer'}</span>
                </div>
                <DeliveryStatusMark status={delivery.status} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
                <span>
                  {delivery.productName} · {delivery.collectionCenterName} ·{' '}
                  {formatDate(delivery.deliveryDate)}
                </span>
                <span className="font-mono">
                  <Quantity value={delivery.acceptedQuantity} unit="kg" size="sm" />
                  {delivery.rejectedQuantity > 0 ? (
                    <span className="text-ink-faint">
                      {' · '}
                      {delivery.rejectedQuantity.toLocaleString('en-US')} kg rejected
                    </span>
                  ) : null}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={`/agent/deliveries?${new URLSearchParams({
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
            href={`/agent/deliveries?${new URLSearchParams({
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