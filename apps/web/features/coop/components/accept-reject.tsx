'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { RejectionReason } from '@gebeyalink/types';

import { Button, Chip } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

const REASONS: { value: RejectionReason; label: string }[] = [
  { value: 'insufficient_stock', label: 'Insufficient stock' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'already_committed', label: 'Already committed' },
  { value: 'operational_issue', label: 'Operational issue' },
  { value: 'incorrect_order', label: 'Incorrect order' },
  { value: 'other', label: 'Other reason' },
];

/**
 * Cooperative staff response to a PENDING order (F2). The API re-checks
 * every rule server-side — this mirrors the business state for UX only.
 */
export function AcceptReject({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectionReason>('insufficient_stock');
  const [explanation, setExplanation] = useState('');

  const run = (task: () => Promise<unknown>, tag: 'accept' | 'reject') => {
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

  const accept = () => run(() => api.acceptOrder(orderId), 'accept');

  const reject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      () =>
        api.rejectOrder(orderId, {
          rejectionReason: reason,
          explanation: reason === 'other' ? explanation.trim() : undefined,
        }),
      'reject',
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {rejecting ? (
        <form
          onSubmit={reject}
          className="flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-4"
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Why reject this order?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rejection reason">
              {REASONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={reason === option.value}
                  onClick={() => {
                    setReason(option.value);
                    setExplanation('');
                  }}
                  type="button"
                >
                  {option.label}
                </Chip>
              ))}
            </div>
            {reason === 'other' ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Explanation
                <textarea
                  className="ds-search h-20 resize-none p-3"
                  value={explanation}
                  onChange={(event) => setExplanation(event.target.value)}
                  placeholder="Required when reason is Other"
                />
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              type="submit"
              disabled={pending || (reason === 'other' && !explanation.trim())}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject order'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={pending} onClick={accept}>
            {busy === 'accept' ? 'Accepting…' : 'Accept order'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setRejecting(true)}
          >
            Reject
          </Button>
        </div>
      )}
      {error ? (
        <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}