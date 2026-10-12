'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import type { AdminMembership, CooperativeOption } from '@/features/admin/types';

/**
 * Admin control over a user's cooperative memberships (docs/prd.md §6.6).
 * Add/activate/deactivate/remove — the API enforces admin-only.
 */
export function UserMembershipControl({
  userId,
  memberships,
  cooperatives,
}: {
  userId: string;
  memberships: AdminMembership[];
  cooperatives: CooperativeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  const memberCoopIds = new Set(memberships.map((m) => m.cooperativeId));
  const addable = cooperatives.filter((coop) => !memberCoopIds.has(coop.id));

  return (
    <div className="flex flex-col gap-2">
      {memberships.length === 0 ? (
        <p className="text-xs text-ink-faint">No cooperative memberships.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {memberships.map((membership) => (
            <li
              key={membership.id}
              className="flex items-center gap-2 rounded-pill border border-line bg-surface-2 py-1 pr-1 pl-3 text-xs"
            >
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${
                  membership.active ? 'bg-st-available' : 'border border-ink-faint'
                }`}
              />
              <span className={membership.active ? 'text-ink' : 'text-ink-faint'}>
                {membership.cooperativeName ?? 'Unknown cooperative'}
              </span>
              <button
                type="button"
                title={membership.active ? 'Deactivate' : 'Activate'}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    api.updateUserMembership(userId, membership.id, { active: !membership.active }),
                  )
                }
                className="rounded-pill px-2 py-0.5 font-medium text-ink-soft hover:bg-surface hover:text-ink"
              >
                {membership.active ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                title="Remove membership"
                disabled={pending}
                onClick={() => run(() => api.removeUserMembership(userId, membership.id))}
                className="rounded-pill px-2 py-0.5 font-medium text-danger hover:bg-danger-soft"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`membership-${userId}`}>
          Add cooperative membership
        </label>
        <select
          id={`membership-${userId}`}
          className="ds-search h-9 w-56"
          value={selected}
          disabled={pending || addable.length === 0}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">
            {addable.length === 0 ? 'All cooperatives added' : 'Add to cooperative…'}
          </option>
          {addable.map((coop) => (
            <option key={coop.id} value={coop.id}>
              {coop.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending || !selected}
          onClick={() =>
            run(async () => {
              await api.addUserMembership(userId, { cooperativeId: selected, active: true });
              setSelected('');
            })
          }
        >
          Add
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}