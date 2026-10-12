import Link from 'next/link';

import type { ShipmentView } from '@/features/transportation/queries';
import { StatusMark } from '@/features/ui';
import { formatDateTime, formatKg } from '@/lib/format';

/** A single assignment in the transporter runsheet — a card, not a table row. */
export function ShipmentCard({ shipment }: { shipment: ShipmentView }) {
  return (
    <Link
      href={`/transport/${shipment.id}`}
      className="card flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-ink">{shipment.productName}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatKg(shipment.quantity)} kg · grade {shipment.qualityGrade}
          </p>
        </div>
        <StatusMark status={shipment.status} />
      </div>
      <div className="flex flex-col gap-1 text-xs text-ink-soft">
        <p>
          <span className="font-medium text-ink">{shipment.pickupLocation}</span> →{' '}
          <span className="font-medium text-ink">{shipment.destination}</span>
        </p>
        <p>
          {shipment.buyerName}
          {shipment.scheduledPickupAt ? ` · pickup ${formatDateTime(shipment.scheduledPickupAt)}` : ''}
        </p>
      </div>
    </Link>
  );
}
