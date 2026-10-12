import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeliveryConfirm } from '@/features/transportation/components/delivery-confirm';
import { PickupConfirm } from '@/features/transportation/components/pickup-confirm';
import { ShipmentSummary } from '@/features/transportation/components/shipment-summary';
import { ShipmentTimeline } from '@/features/transportation/components/shipment-timeline';
import { TransporterDeliver } from '@/features/transportation/components/transporter-deliver';
import { getShipmentView } from '@/features/transportation/queries';
import { Card, StatusMark } from '@/features/ui';
import { formatKg } from '@/lib/format';
import { requirePageRole } from '@/lib/session';

export default async function TransporterShipmentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageRole('transporter');
  const { id } = await props.params;
  const shipment = await getShipmentView(session, id).catch(() => null);
  if (!shipment) notFound();

  const canPickup =
    !shipment.transporterPickupConfirmedAt &&
    (shipment.status === 'PICKUP_PENDING' || shipment.status === 'PICKUP_CONFIRMED');
  const canDeliver = shipment.status === 'IN_TRANSIT' || shipment.status === 'DELAYED';
  const awaitingBuyer = shipment.status === 'DELIVERED';

  return (
    <div className="flex flex-col gap-6">
      <Link href="/transport" className="text-xs font-medium text-ink-soft hover:text-ink">
        ← Runsheet
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{shipment.productName}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatKg(shipment.quantity)} kg · grade {shipment.qualityGrade} · {shipment.buyerName}
          </p>
        </div>
        <StatusMark status={shipment.status} />
      </div>

      <Card padding="lg" className="flex flex-col gap-6">
        <ShipmentTimeline orderStatus={shipment.orderStatus} shipment={shipment} />

        {canPickup ? (
          <div className="rounded-card border border-line bg-surface-2 p-4">
            <p className="text-sm font-semibold text-ink">Confirm pickup</p>
            <p className="mt-1 text-xs text-ink-soft">
              Confirm you have received the goods from the cooperative. Dispatch begins once both
              sides confirm.
            </p>
            <div className="mt-3">
              <PickupConfirm shipmentId={shipment.id} side="transporter" />
            </div>
          </div>
        ) : null}

        {canDeliver ? <TransporterDeliver shipmentId={shipment.id} /> : null}

        {awaitingBuyer ? (
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-4">
            <p className="text-sm font-semibold text-ink">Delivered — awaiting buyer confirmation</p>
            <p className="text-xs text-ink-soft">
              The buyer confirms receipt to complete the order and take ownership. You can record
              the confirmation on their behalf if needed.
            </p>
            <DeliveryConfirm shipmentId={shipment.id} />
          </div>
        ) : null}
      </Card>

      <Card padding="lg">
        <ShipmentSummary shipment={shipment} />
      </Card>
    </div>
  );
}
