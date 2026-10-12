import type { ShipmentDto } from '@gebeyalink/types';

import { StatusMark } from '@/features/ui';
import { formatDateTime } from '@/lib/format';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Read-only shipment facts — transporter, route, schedule, cost. */
export function ShipmentSummary({ shipment }: { shipment: ShipmentDto }) {
  const cost = shipment.transportCost;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Transport</p>
        <StatusMark status={shipment.status} />
      </div>
      <dl className="flex flex-col">
        <Row label="Transporter" value={shipment.transporterName} />
        {shipment.transporterPhone ? <Row label="Contact" value={shipment.transporterPhone} /> : null}
        {shipment.vehicleType ? <Row label="Vehicle" value={shipment.vehicleType} /> : null}
        {shipment.vehiclePlate ? <Row label="Plate" value={shipment.vehiclePlate} /> : null}
        {shipment.driverName ? <Row label="Driver" value={shipment.driverName} /> : null}
        <Row label="Pickup" value={shipment.pickupLocation} />
        <Row label="Destination" value={shipment.destination} />
        {shipment.scheduledPickupAt ? (
          <Row label="Scheduled pickup" value={formatDateTime(shipment.scheduledPickupAt)} />
        ) : null}
        {shipment.expectedDeliveryAt ? (
          <Row label="Expected delivery" value={formatDateTime(shipment.expectedDeliveryAt)} />
        ) : null}
        {cost !== null ? <Row label="Transport cost" value={`${cost} ETB`} /> : null}
      </dl>
    </div>
  );
}
