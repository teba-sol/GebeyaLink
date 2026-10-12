import Link from 'next/link';
import type { ReactNode } from 'react';

import { getAgentDelivery } from '@/features/agent/queries';
import { DeliveryStatusMark } from '@/features/agent/components/delivery-status';
import { Eyebrow, GradeMark, Quantity } from '@/features/ui';
import { formatDateTime } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function AgentDeliveryDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageRole('collection_agent');
  const { id } = await props.params;
  const delivery = await getAgentDelivery(session, id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Eyebrow>Collection agent · recording</Eyebrow>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold">Delivery snapshot</h1>
          <DeliveryStatusMark status={delivery.status} />
        </div>
        <p className="text-sm text-ink-soft">
          {delivery.collectionCenterName} · recorded {formatDateTime(delivery.deliveryDate)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
          <h2 className="font-display text-base font-semibold">Farmer</h2>
          <p className="text-sm">{delivery.farmerName ?? 'Farmer record'}</p>
          <p className="text-xs text-ink-soft">
            {delivery.farmerLocation ?? 'Location not set'}
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Goods</h2>
            <GradeMark grade={delivery.qualityGrade} size="sm" />
          </div>
          <dl className="divide-y divide-line text-sm">
            <Row label="Commodity">{delivery.productName}</Row>
            <Row label="Claimed">
              <Quantity value={delivery.claimedQuantity} unit="kg" size="sm" />
            </Row>
            <Row label="Measured net">
              <Quantity value={delivery.measuredQuantity} unit="kg" size="sm" />
            </Row>
            <Row label="Quality grade">
              {delivery.qualityGrade === 'REJECTED' ? 'Rejected' : `Grade ${delivery.qualityGrade}`}
            </Row>
            <Row label="Accepted">
              <Quantity value={delivery.acceptedQuantity} unit="kg" size="sm" />
            </Row>
            <Row label="Rejected">
              <Quantity value={delivery.rejectedQuantity} unit="kg" size="sm" />
            </Row>
          </dl>
        </section>

        {delivery.notes ? (
          <p className="rounded-card border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
            {delivery.notes}
          </p>
        ) : null}

        <p className="text-xs text-ink-faint">
          {delivery.acceptedQuantity > 0
            ? `Accepted stock was added to the ${delivery.collectionCenterName} lot for this commodity.`
            : 'This is a rejected delivery — no inventory was created.'}
          {delivery.recordedByName ? ` Recorded by ${delivery.recordedByName}.` : ''}
        </p>

        <Link href="/agent/deliveries" className="text-sm font-medium text-accent hover:underline">
          ← All recordings
        </Link>
      </div>
    </div>
  );
}