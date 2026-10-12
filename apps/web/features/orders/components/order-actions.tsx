'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { OrderStatus, PaymentStatus } from '@gebeyalink/types';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import { formatBirr } from '@/lib/format';

const PAYMENT_METHODS = [
  ['bank_transfer', 'Bank transfer'],
  ['mobile_money', 'Mobile money'],
  ['bank_deposit', 'Bank deposit'],
  ['cash', 'Cash'],
] as const;

/**
 * Buyer actions driven by business state, mirroring server authz (the API
 * still re-checks everything): cancel only while PENDING, pay only once the
 * cooperative has ACCEPTED and no attempt is already awaiting verification.
 */
export function OrderActions({
  orderId,
  status,
  productTotal,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  productTotal: number;
  paymentStatus: PaymentStatus | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState('');

  const fail = (err: unknown) => {
    setError(err instanceof ApiError ? err.message : 'That could not be completed.');
  };

  const run = (task: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (err) {
        fail(err);
      }
    });
  };

  const cancel = () => run(() => api.cancelOrder(orderId));
  const pay = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(() =>
      api.submitPayment(orderId, {
        amount: productTotal,
        method,
        reference: reference.trim() || undefined,
      }),
    );
  };

  if (status === 'PENDING') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-btn border border-line bg-surface-2 px-4 py-3 text-xs text-ink-soft">
          This order is awaiting the cooperative&apos;s response. You can cancel
          it any time before the window closes — reserved stock returns to
          available immediately.
        </div>
        <Button variant="danger" disabled={pending} onClick={cancel}>
          {pending ? 'Cancelling…' : 'Cancel order'}
        </Button>
        {error ? (
          <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === 'ACCEPTED') {
    if (paymentStatus === 'PENDING') {
      return (
        <div className="flex flex-col gap-3 rounded-btn border border-line bg-surface-2 px-4 py-3">
          <p className="text-sm font-semibold text-ink">Payment awaiting verification</p>
          <p className="text-xs text-ink-soft">
            The cooperative is confirming receipt of your {formatBirr(productTotal)}{' '}
            transfer. No action needed — this clears automatically.
          </p>
        </div>
      );
    }
    return (
      <form onSubmit={pay} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">Submit payment</p>
          <p className="text-xs text-ink-soft">
            {paymentStatus === 'FAILED'
              ? 'The previous attempt was not verified — please resubmit with a new reference.'
              : 'The cooperative accepted your order. Pay the full product total directly to the cooperative and record it here.'}
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Amount (fixed — full payment)
          <input
            className="ds-search h-10 font-mono"
            type="text"
            value={formatBirr(productTotal)}
            readOnly
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Method
          <select
            className="ds-search h-10"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            {PAYMENT_METHODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Reference (optional)
          <input
            className="ds-search h-10"
            type="text"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="e.g. CBE transfer ID"
          />
        </label>
        <Button size="lg" type="submit" disabled={pending}>
          {pending ? 'Recording payment…' : 'Record payment'}
        </Button>
        {error ? (
          <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return null;
}