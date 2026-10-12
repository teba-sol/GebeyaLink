import Link from 'next/link';

import {
  getAgentContext,
  listAgentCenters,
  listAgentDeliveries,
} from '@/features/agent/queries';
import { DeliveryStatusMark } from '@/features/agent/components/delivery-status';
import { Button, Eyebrow, GradeMark, Quantity } from '@/features/ui';
import { formatDate } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

export default async function AgentTodayPage() {
  const session = await requirePageRole('collection_agent');

  const [coopNames, centers, recent] = await Promise.all([
    getAgentContext(session),
    listAgentCenters(session),
    listAgentDeliveries(session, { page: 1, limit: 5 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Collection agent · today</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">Pick-ups</h1>
        <p className="text-sm text-ink-soft">
          {coopNames.length > 0 ? coopNames.join(', ') : 'Your cooperative'} — pick the center to
          record a delivery.
        </p>
      </div>

      <section className="flex flex-col gap-3" aria-label="Collection centers">
        {centers.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-card border border-dashed border-line-strong px-4 py-8 text-center">
            <p className="text-sm text-ink-soft">
              No active collection centers are assigned to your cooperative yet.
            </p>
            <p className="text-xs text-ink-faint">
              Cooperative administrators register centers; recordings at a center become lot stock
              there.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {centers.map((center) => (
              <div
                key={center.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-display text-base font-semibold">{center.name}</p>
                    <p className="text-xs text-ink-soft">{center.location ?? 'Location not set'}</p>
                  </div>
                </div>
                <Link href={`/agent/new?center=${center.id}`} className="shrink-0">
                  <Button size="sm" className="w-full md:w-auto">
                    Record delivery
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Recent recordings</h2>
          <Link href="/agent/deliveries" className="text-sm font-medium text-accent hover:underline">
            All history
          </Link>
        </div>

        {recent.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-faint">
            No deliveries recorded yet today.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.items.map((delivery) => (
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
                    {delivery.productName} · {delivery.collectionCenterName}
                  </span>
                  <span className="font-mono">
                    <Quantity value={delivery.acceptedQuantity} unit="kg" size="sm" />
                  </span>
                </div>
                <span className="font-mono text-[0.6875rem] text-ink-faint">
                  {formatDate(delivery.deliveryDate)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-ink-faint">
        Recorded, accepted deliveries add stock to the center&apos;s inventory lot; rejected
        deliveries never create inventory. From today, tap Record in the bottom bar — no paper
        ledger needed.
      </p>
    </div>
  );
}