import { listCoopDeliveries } from '@/features/coop/queries';
import { Eyebrow } from '@/features/ui';
import { formatDate, formatKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

const PAGE_SIZE = 30;

function DeliveryStatusMark({ status }: { status: string }) {
  const rejected = status === 'REJECTED';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${rejected ? 'bg-danger' : 'bg-st-available'}`}
      />
      <span className={rejected ? 'text-danger' : 'text-ink'}>
        {rejected ? 'Rejected' : 'Accepted'}
      </span>
    </span>
  );
}

export default async function OpsDeliveriesPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePageRole('cooperative_staff');
  const { page } = await props.searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const deliveries = await listCoopDeliveries(session, { page: currentPage, limit: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(deliveries.total / PAGE_SIZE));
  const acceptedKg = deliveries.items
    .filter((d) => d.status === 'ACCEPTED')
    .reduce((sum, d) => sum + d.acceptedQuantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Cooperative · intake</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Deliveries</h1>
        <p className="text-sm text-ink-soft">
          {deliveries.total.toLocaleString('en-US')} recorded deliveries — {formatKg(acceptedKg)} kg
          accepted on this page. Agents capture intake at the collection center; accepted deliveries
          flow straight into this cooperative&apos;s inventory.
        </p>
      </div>

      {deliveries.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
          No deliveries recorded yet. Collection agents record intake at the centers.
        </div>
      ) : (
        <ol className="flex flex-col">
          {deliveries.items.map((delivery, index) => (
            <li key={delivery.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    delivery.status === 'ACCEPTED' ? 'bg-st-available' : 'bg-danger'
                  }`}
                />
                {index < deliveries.items.length - 1 ? (
                  <span aria-hidden="true" className="w-px flex-1 bg-line" />
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold">{delivery.farmerName}</p>
                    <span className="font-mono text-xs text-ink-faint">
                      {formatDate(delivery.deliveryDate)}
                    </span>
                  </div>
                  <DeliveryStatusMark status={delivery.status} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                  <span>{delivery.productName}</span>
                  <span aria-hidden="true" className="text-ink-faint">
                    ·
                  </span>
                  <span>{delivery.collectionCenterName}</span>
                  <span aria-hidden="true" className="text-ink-faint">
                    ·
                  </span>
                  <span>Grade {delivery.qualityGrade === 'REJECTED' ? '—' : delivery.qualityGrade}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-pill border border-line bg-surface px-2.5 py-0.5">
                    Claimed <span className="font-mono">{formatKg(delivery.claimedQuantity)}</span> kg
                  </span>
                  <span className="rounded-pill border border-line bg-surface px-2.5 py-0.5">
                    Measured <span className="font-mono">{formatKg(delivery.measuredQuantity)}</span> kg
                  </span>
                  {delivery.status === 'ACCEPTED' ? (
                    <span className="rounded-pill border border-st-available/40 bg-st-available/10 px-2.5 py-0.5 text-ink">
                      Accepted{' '}
                      <span className="font-mono font-semibold">
                        {formatKg(delivery.acceptedQuantity)}
                      </span>{' '}
                      kg
                    </span>
                  ) : (
                    <span className="rounded-pill border border-danger/40 bg-danger-soft px-2.5 py-0.5 text-danger">
                      Rejected{' '}
                      <span className="font-mono font-semibold">
                        {formatKg(delivery.rejectedQuantity)}
                      </span>{' '}
                      kg
                    </span>
                  )}
                </div>

                {delivery.notes ? (
                  <p className="text-xs text-ink-faint">{delivery.notes}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <a
            href={`/ops/deliveries?page=${Math.max(1, currentPage - 1)}`}
            aria-disabled={currentPage <= 1}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              currentPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Previous
          </a>
          <span className="font-mono text-xs text-ink-soft">
            Page {currentPage} of {totalPages}
          </span>
          <a
            href={`/ops/deliveries?page=${Math.min(totalPages, currentPage + 1)}`}
            aria-disabled={currentPage >= totalPages}
            className={`rounded-btn border border-line-strong bg-surface px-4 py-2 font-medium ${
              currentPage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-2'
            }`}
          >
            Next
          </a>
        </div>
      ) : null}
    </div>
  );
}