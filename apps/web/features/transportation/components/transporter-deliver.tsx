'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { ShipmentCondition } from '@gebeyalink/types';

import { Button, Chip } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

const CONDITIONS: { value: ShipmentCondition; label: string }[] = [
  { value: 'good', label: 'Good condition' },
  { value: 'minor_damage', label: 'Minor damage' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'spoiled', label: 'Spoiled' },
];

/**
 * Transporter marks the goods delivered (docs/prd.md §27–§28): records the
 * received quantity (where available) and the general condition, so the buyer
 * has what they need to decide whether to confirm or dispute.
 */
export function TransporterDeliver({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [condition, setCondition] = useState<ShipmentCondition>('good');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await api.deliverShipment(shipmentId, {
          condition,
          receivedQuantity: receivedQuantity.trim() ? Number(receivedQuantity) : undefined,
          notes: notes.trim() || undefined,
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
        <p className="text-sm font-semibold text-ink">Mark as delivered</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          Record the condition of the goods on arrival. The buyer confirms delivery next.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Condition on arrival</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Shipment condition">
          {CONDITIONS.map((option) => (
            <Chip
              key={option.value}
              selected={condition === option.value}
              onClick={() => setCondition(option.value)}
              type="button"
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Received quantity, kg <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={receivedQuantity}
            onChange={(event) => setReceivedQuantity(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Notes <span className="font-normal text-ink-faint">(optional)</span>
          <input
            className="ds-search h-11 px-3"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Two sacks slightly damp"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Recording…' : 'Mark delivered'}
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
