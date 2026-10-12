'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Admin cooperative status control (F4). Only admins may change a
 * cooperative's active/inactive status — the API enforces that; this
 * mirrors it for UX only.
 */
export function CooperativeStatusAction({
  cooperativeId,
  status,
}: {
  cooperativeId: string;
  status: 'active' | 'inactive';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = status === 'active' ? 'inactive' : 'active';

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.updateCooperative(cooperativeId, { status: target });
        router.refresh();
        setConfirming(false);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-soft">
          {target === 'inactive'
            ? 'Suspend this cooperative? Its listings stay up but it stops appearing in new flows.'
            : 'Reactivate this cooperative?'}
        </p>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" disabled={pending} onClick={run}>
            {pending ? 'Saving…' : target === 'inactive' ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
        {error ? (
          <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={status === 'active' ? 'secondary' : 'primary'}
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        {status === 'active' ? 'Suspend' : 'Activate'}
      </Button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}