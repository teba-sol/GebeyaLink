import { ShipmentCard } from '@/features/transportation/components/shipment-card';
import { listTransporterShipmentsView } from '@/features/transportation/queries';
import { requirePageRole } from '@/lib/session';

const ACTIVE: ReadonlySet<string> = new Set([
  'PICKUP_PENDING',
  'PICKUP_CONFIRMED',
  'IN_TRANSIT',
  'DELAYED',
]);

export default async function TransporterRunsheetPage() {
  const session = await requirePageRole('transporter');
  const shipments = await listTransporterShipmentsView(session);
  const active = shipments.filter((shipment) => ACTIVE.has(shipment.status));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Runsheet</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {active.length === 0
            ? 'No active pickups or deliveries assigned to you.'
            : `${active.length} active ${active.length === 1 ? 'assignment' : 'assignments'}.`}
        </p>
      </div>

      {active.length === 0 ? (
        <p className="rounded-card border border-line bg-surface-2 px-4 py-6 text-center text-sm text-ink-soft">
          New assignments will appear here once a cooperative arranges transport.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((shipment) => (
            <ShipmentCard key={shipment.id} shipment={shipment} />
          ))}
        </div>
      )}
    </div>
  );
}
