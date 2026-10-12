import { ShipmentCard } from '@/features/transportation/components/shipment-card';
import { listTransporterShipmentsView } from '@/features/transportation/queries';
import { requirePageRole } from '@/lib/session';

const ACTIVE: ReadonlySet<string> = new Set([
  'PICKUP_PENDING',
  'PICKUP_CONFIRMED',
  'IN_TRANSIT',
  'DELAYED',
]);

export default async function TransporterHistoryPage() {
  const session = await requirePageRole('transporter');
  const shipments = await listTransporterShipmentsView(session);
  const past = shipments.filter((shipment) => !ACTIVE.has(shipment.status));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">History</h1>
        <p className="mt-1 text-sm text-ink-soft">Completed and cancelled assignments.</p>
      </div>

      {past.length === 0 ? (
        <p className="rounded-card border border-line bg-surface-2 px-4 py-6 text-center text-sm text-ink-soft">
          Nothing here yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {past.map((shipment) => (
            <ShipmentCard key={shipment.id} shipment={shipment} />
          ))}
        </div>
      )}
    </div>
  );
}
