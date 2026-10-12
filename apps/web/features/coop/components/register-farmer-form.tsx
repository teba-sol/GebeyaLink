'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

type CoopOption = { id: string; name: string };

/**
 * Cooperative-managed farmer registration (docs/prd.md §6.3, §8.1).
 * Cooperative staff register farmers within their own membership; the API
 * enforces the scope — this mirrors it for UX only.
 */
export function RegisterFarmerForm({ cooperatives }: { cooperatives: CoopOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cooperativeId, setCooperativeId] = useState(cooperatives[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const canSubmit = name.trim().length >= 2 && cooperativeId !== '';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.createFarmer({
          cooperativeId,
          name: name.trim(),
          phone: phone.trim() || null,
          location: location.trim() || null,
        });
        setName('');
        setPhone('');
        setLocation('');
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Register farmer"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-4"
    >
      <p className="text-xs font-semibold text-ink-soft">Register a farmer</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          Full name
          <input
            className="ds-search h-9"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Abebe Kebede"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
          Phone (optional)
          <input
            className="ds-search h-9"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="09•• ••• •••"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
          Location (optional)
          <input
            className="ds-search h-9"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Ada’a woreda"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || !canSubmit}>
          {pending ? 'Registering…' : 'Register farmer'}
        </Button>
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}