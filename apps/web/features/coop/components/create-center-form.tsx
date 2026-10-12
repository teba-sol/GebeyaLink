'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

type CoopOption = { id: string; name: string };

/**
 * Cooperative-managed collection centers (docs/prd.md §6.3, §9). Cooperative
 * staff register centers within their own membership; the API enforces the
 * scope (admin | cooperative_staff) — this mirrors it for UX only.
 */
export function CreateCenterForm({ cooperatives }: { cooperatives: CoopOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [cooperativeId, setCooperativeId] = useState(cooperatives[0]?.id ?? '');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const canSubmit = name.trim().length >= 2 && cooperativeId !== '';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.createCollectionCenter({
          cooperativeId,
          name: name.trim(),
          location: location.trim() || null,
        });
        setName('');
        setLocation('');
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add collection center
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface-2 p-4">
      <p className="text-xs font-semibold text-ink-soft">New collection center</p>
      {cooperatives.length > 1 ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
          Cooperative
          <select
            className="ds-search h-9"
            value={cooperativeId}
            onChange={(event) => setCooperativeId(event.target.value)}
          >
            {cooperatives.map((coop) => (
              <option key={coop.id} value={coop.id}>
                {coop.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
        Center name
        <input
          className="ds-search h-9"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Dodota Primary Center"
          required
          minLength={2}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
        Location (optional)
        <input
          className="ds-search h-9"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Dodota woreda"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !canSubmit}>
          {pending ? 'Adding…' : 'Add center'}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}