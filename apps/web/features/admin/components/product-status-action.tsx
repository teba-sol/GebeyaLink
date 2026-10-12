'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Admin product activation control (F4 catalog management). Only admins may
 * change a product's active status — the API enforces that; this mirrors it
 * for UX only.
 */
export function ProductStatusAction({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.updateProduct(productId, { active: !active });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={active ? 'secondary' : 'primary'}
        size="sm"
        disabled={pending}
        onClick={run}
      >
        {active ? 'Deactivate' : 'Activate'}
      </Button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}