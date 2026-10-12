'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { VerificationRequestDto, VerificationStatus } from '@gebeyalink/types';

import { Button, VerificationMark } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

type VerificationActionName = 'under_review' | 'approve' | 'reject' | 'suspend';

const ACTIONS: Record<
  VerificationStatus,
  { action: VerificationActionName; label: string; variant: 'primary' | 'secondary' | 'danger' }[]
> = {
  pending: [
    { action: 'under_review', label: 'Start review', variant: 'secondary' },
    { action: 'approve', label: 'Approve', variant: 'primary' },
    { action: 'reject', label: 'Reject', variant: 'danger' },
  ],
  under_review: [
    { action: 'approve', label: 'Approve', variant: 'primary' },
    { action: 'reject', label: 'Reject', variant: 'danger' },
  ],
  approved: [{ action: 'suspend', label: 'Suspend', variant: 'danger' }],
  rejected: [
    { action: 'under_review', label: 'Reopen', variant: 'secondary' },
    { action: 'approve', label: 'Approve', variant: 'primary' },
  ],
  suspended: [{ action: 'approve', label: 'Reinstate', variant: 'primary' }],
};

const TYPE_LABEL: Record<VerificationRequestDto['type'], string> = {
  cooperative: 'Cooperative',
  buyer: 'Buyer',
  transporter: 'Transporter',
};

function VerificationRow({ item }: { item: VerificationRequestDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const actions = ACTIONS[item.status];

  const run = (action: VerificationActionName) => {
    setError(null);
    startTransition(async () => {
      try {
        await api.updateVerification(item.type, item.id, {
          action,
          note: note.trim() || null,
        });
        setNote('');
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-pill border border-line bg-surface-2 px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold tracking-[0.12em] text-ink-soft uppercase">
              {TYPE_LABEL[item.type]}
            </span>
            <p className="text-sm font-semibold">{item.name}</p>
            <VerificationMark status={item.status} />
          </div>
          <p className="font-mono text-xs text-ink-faint">
            {item.submittedByName ?? item.submittedByEmail ?? item.submittedByUserId ?? 'unknown'}
            {item.region ? ` · ${item.region}` : ''}
            {item.submittedAt ? ` · submitted ${item.submittedAt.slice(0, 10)}` : ''}
          </p>
          {item.reviewNote ? (
            <p className="text-xs text-ink-soft">
              <span className="font-medium">Review note:</span> {item.reviewNote}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.action}
              variant={action.variant}
              size="sm"
              disabled={pending || (action.action === 'reject' && note.trim().length === 0)}
              onClick={() => run(action.action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Review note {item.status === 'pending' || item.status === 'under_review' ? '(required to reject)' : ''}
        <input
          className="ds-search text-sm"
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason for the decision (optional unless rejecting)"
        />
      </label>

      {error ? (
        <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function VerificationQueue({ items }: { items: VerificationRequestDto[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-ink-faint">
        No organizations in this view. Registrations appear here as they are submitted.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <VerificationRow key={`${item.type}:${item.id}`} item={item} />
      ))}
    </div>
  );
}
