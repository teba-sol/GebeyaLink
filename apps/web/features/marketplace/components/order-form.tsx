'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';

import { QuantityStepper } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import { formatBirr } from '@/lib/format';

/**
 * Place-order surface on the listing page. Quantity is ceilinged by live
 * lot availability and floored by the platform MOQ; the total reflects the
 * server-side `unitPrice × quantity` snapshot.
 */
export function OrderForm({
  listingId,
  minOrderKg,
  availableKg,
  pricePerUnit,
}: {
  listingId: string;
  minOrderKg: number;
  availableKg: number;
  pricePerUnit: number;
}) {
  const router = useRouter();
  const [quantityKg, setQuantityKg] = useState(() => Math.min(minOrderKg, availableKg));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unorderable = availableKg < minOrderKg;
  const total = quantityKg * pricePerUnit;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const order = await api.placeOrder({ listingId, quantity: quantityKg });
        router.push(`/orders/${order.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Order could not be placed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 self-start rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Place order
        </p>
        <p className="text-xs text-gray-500">
          Stock is reserved the moment the order is placed.
        </p>
      </div>

      {/* Quantity Stepper Wrapper */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-800">Quantity (kg)</label>
        <QuantityStepper
          minKg={minOrderKg}
          stepKg={500}
          initialKg={Math.min(minOrderKg, availableKg)}
          availableKg={availableKg}
          onChange={setQuantityKg}
        />
      </div>

      {/* Order Summary / Price Breakdown */}
      <dl className="flex flex-col gap-3 border-t border-gray-100 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Unit price</dt>
          <dd className="font-mono font-medium text-gray-900">
            {formatBirr(pricePerUnit)} / kg
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">
            {new Intl.NumberFormat('en-US').format(quantityKg)} kg
          </dt>
          <dd className="font-mono font-medium text-gray-900">{formatBirr(total)}</dd>
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-4 text-base">
          <dt className="font-semibold text-gray-900">Total</dt>
          <dd className="font-mono font-bold text-[#0F3A2C]">{formatBirr(total)}</dd>
        </div>
      </dl>

      {/* Action Button */}
      {unorderable ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[#E7C455] bg-[#FBF0D4] px-3 py-2.5">
          <p className="text-xs font-semibold text-[#7A5A0A]">
            Only {availableKg.toLocaleString('en-US')} kg available —
            below the {minOrderKg.toLocaleString('en-US')} kg minimum order
          </p>
          <p className="text-xs text-[#8A6D1F]">
            This lot can’t be reserved until more of it is graded into
            inventory. Check back later.
          </p>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={pending}
          className="w-full rounded-lg bg-[#0F3A2C] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#154a38] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Reserving stock…' : 'Reserve stock & order'}
        </button>
      )}

      {/* Error Message */}
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Footer Note */}
      <p className="text-xs leading-relaxed text-gray-500">
        The cooperative responds within its response window. You can cancel
        while the order is still pending.
      </p>
    </div>
  );
}