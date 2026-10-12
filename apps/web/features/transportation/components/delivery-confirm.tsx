'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Buyer confirms delivery (docs/prd.md §30): the shipment is marked
 * DELIVERY_CONFIRMED and the order COMPLETED, transferring ownership
 * (docs/prd.md §29). The API allows the transporter/admin to record it on the
 * buyer's behalf for support cases.
 */
export function DeliveryConfirm({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.confirmDelivery(shipmentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={pending} onClick={confirm}>
        {pending ? 'Confirming…' : 'Confirm delivery received'}
      </Button>
      <p className="text-xs text-ink-soft">
        Confirming transfers ownership to you and completes the order.
      </p>
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
