'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Chip } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import type { ApprovedTransporterOption } from '@/features/transportation/queries';

type Mode = 'platform' | 'external' | 'later';

/**
 * Arrange transport for a paid order (docs/prd.md §24). The cooperative may
 * assign an approved platform transporter, name an external party, or record
 * the shipment now and assign a transporter later. The API enforces the
 * payment gate and transporter approval — this mirrors the state for UX.
 */
export function ArrangeTransport({
  orderId,
  transporters,
  defaultPickup,
  defaultDestination,
}: {
  orderId: string;
  transporters: ApprovedTransporterOption[];
  defaultPickup: string;
  defaultDestination: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>(transporters.length > 0 ? 'platform' : 'external');
  const [transporterId, setTransporterId] = useState(transporters[0]?.id ?? '');
  const [externalName, setExternalName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [pickupLocation, setPickupLocation] = useState(defaultPickup);
  const [destination, setDestination] = useState(defaultDestination);
  const [cost, setCost] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('');

  const ready =
    pickupLocation.trim().length > 0 &&
    destination.trim().length > 0 &&
    (mode === 'later' || (mode === 'platform' && transporterId) || (mode === 'external' && externalName.trim().length > 0));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.createShipment(orderId, {
          transporterId: mode === 'platform' ? transporterId : undefined,
          externalTransporterName: mode === 'external' ? externalName.trim() : undefined,
          vehicleType: vehicleType.trim() || undefined,
          vehiclePlate: vehiclePlate.trim() || undefined,
          driverName: driverName.trim() || undefined,
          pickupLocation: pickupLocation.trim(),
          destination: destination.trim(),
          transportCost: cost.trim() ? Number(cost) : undefined,
          scheduledPickupAt: pickupAt ? new Date(pickupAt) : undefined,
          expectedDeliveryAt: deliveryAt ? new Date(deliveryAt) : undefined,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Arrange transport</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          Payment is confirmed. Record who moves the goods to the buyer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Transporter type">
        {transporters.length > 0 ? (
          <Chip selected={mode === 'platform'} onClick={() => setMode('platform')} type="button">
            Platform transporter
          </Chip>
        ) : null}
        <Chip selected={mode === 'external'} onClick={() => setMode('external')} type="button">
          External transporter
        </Chip>
        <Chip selected={mode === 'later'} onClick={() => setMode('later')} type="button">
          Decide later
        </Chip>
      </div>

      {mode === 'platform' ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Approved transporter
          <select
            className="ds-search h-11 px-3"
            value={transporterId}
            onChange={(event) => setTransporterId(event.target.value)}
          >
            {transporters.map((option) => (
              <option key={option.id} value={option.id}>
                {option.companyName}
                {option.region ? ` · ${option.region}` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode === 'external' ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          External transporter name
          <input
            className="ds-search h-11 px-3"
            value={externalName}
            onChange={(event) => setExternalName(event.target.value)}
            placeholder="e.g. Mesfin Trucking"
          />
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Pickup location
          <input
            className="ds-search h-11 px-3"
            value={pickupLocation}
            onChange={(event) => setPickupLocation(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Destination
          <input
            className="ds-search h-11 px-3"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Vehicle type <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            placeholder="e.g. Isuzu NPR"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Vehicle plate <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={vehiclePlate}
            onChange={(event) => setVehiclePlate(event.target.value)}
            placeholder="e.g. 3-AA-12345"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Driver / contact <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={driverName}
            onChange={(event) => setDriverName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Transport cost, ETB <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            inputMode="decimal"
            placeholder="Separate from product price"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Scheduled pickup <span className="font-normal text-ink-faint">(optional)</span>
          <input
            type="datetime-local"
            className="ds-search h-11 px-3"
            value={pickupAt}
            onChange={(event) => setPickupAt(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Expected delivery <span className="font-normal text-ink-faint">(optional)</span>
          <input
            type="datetime-local"
            className="ds-search h-11 px-3"
            value={deliveryAt}
            onChange={(event) => setDeliveryAt(event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || !ready}>
          {pending ? 'Arranging…' : 'Arrange transport'}
        </Button>
      </div>

      {error ? (
        <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
