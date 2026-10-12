'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ApiError, api } from '@/lib/api/client';

/** Cooperative/admin collection-center activation control (docs/prd.md §9). */
export function CenterStatusAction({
  centerId,
  active,
}: {
  centerId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.updateCollectionCenter(centerId, { active: !active });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={run}
      className="rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-soft hover:bg-surface-2"
    >
      {active ? 'Deactivate' : 'Activate'}
      {error ? <span className="ml-2 text-danger">{error}</span> : null}
    </button>
  );
}