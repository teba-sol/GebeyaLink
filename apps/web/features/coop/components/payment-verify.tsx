'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { PaymentDto } from '@gebeyalink/types';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import { formatBirr } from '@/lib/format';

/**
 * Cooperative attestation of a buyer's direct payment (F2): confirm receipt
 * (payment PENDING → CONFIRMED, order → PAYMENT_CONFIRMED) or record that
 * it did not arrive (→ FAILED; the order stays ACCEPTED for a new attempt).
 * Renders nothing once the attempt is resolved.
 */
export function VerifyPayment({ payment }: { payment: PaymentDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'confirm' | 'fail' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');

  const run = (task: () => Promise<unknown>, tag: 'confirm' | 'fail') => {
    setError(null);
    setBusy(tag);
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      } finally {
        setBusy(null);
      }
    });
  };

  if (payment.status !== 'PENDING') return null;

  const confirm = () => run(() => api.confirmPayment(payment.id), 'confirm');

  const fail = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(() => api.failPayment(payment.id, { reason: reason.trim() }), 'fail');
  };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Verify payment receipt</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          The buyer reports paying {formatBirr(payment.amount)} directly to the
          cooperative. Confirm the funds arrived, or record that they did not.
        </p>
      </div>
      {failing ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={pending} onClick={confirm}>
            {busy === 'confirm' ? 'Confirming…' : 'Confirm received'}
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setFailing(true)}>
            Mark as not received
          </Button>
        </div>
      )}
      {failing ? (
        <form onSubmit={fail} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Reason it failed (shown to the buyer)
            <textarea
              className="ds-search h-20 resize-none p-3"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. No matching transfer arrived yesterday"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" size="sm" type="submit" disabled={pending || !reason.trim()}>
              {busy === 'fail' ? 'Recording…' : 'Mark payment failed'}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setFailing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}