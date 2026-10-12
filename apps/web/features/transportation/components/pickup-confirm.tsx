'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * One side of the dual pickup confirmation (docs/prd.md §26). The cooperative
 * and the transporter each confirm handover; only when both are recorded does
 * the shipment move to IN_TRANSIT. Pickup is blocked until payment is
 * confirmed (FR-028) — the API enforces it.
 */
export function PickupConfirm({
  shipmentId,
  side,
}: {
  shipmentId: string;
  side: 'cooperative' | 'transporter';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.confirmPickup(shipmentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" disabled={pending} onClick={confirm}>
        {pending
          ? 'Confirming…'
          : side === 'cooperative'
            ? 'Confirm goods handed over'
            : 'Confirm goods received'}
      </Button>
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
