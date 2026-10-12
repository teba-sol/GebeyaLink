'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Card } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Register a collection center at a cooperative (F4 gap closure). Centers are
 * admin-managed — the API enforces `createCollectionCenter` requires admin;
 * this mirrors it for UX only.
 */
export function CreateCenterForm({ cooperativeId }: { cooperativeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.createCollectionCenter({
          cooperativeId,
          name: trimmed,
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

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Add collection center
        </Button>
      ) : (
        <Card padding="sm" className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Register a collection center</p>
          <form onSubmit={submit} className="flex flex-col gap-3" aria-label="New collection center">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Center name
              <input
                className="ds-search h-10"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Dodota hub"
                required
                minLength={2}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Location
              <input
                className="ds-search h-10"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Dodota, Arsi zone (optional)"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={pending || name.trim().length < 2}>
                {pending ? 'Saving…' : 'Save center'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
            {error ? (
              <p
                className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </form>
        </Card>
      )}
    </div>
  );
}