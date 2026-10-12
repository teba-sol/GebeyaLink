'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Card } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Add a product to the global reference catalog (F4 gap closure). Products are
 * admin-managed (docs/prd.md §10) — the API enforces `createProduct` requires
 * admin; this mirrors it for UX only.
 */
export function CreateProductForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);

  const canSubmit = name.trim().length >= 2;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.createProduct({
          name: name.trim(),
          slug: slug.trim() || undefined,
          active,
        });
        setName('');
        setSlug('');
        setActive(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <form onSubmit={submit} aria-label="New product" className="flex flex-col gap-3">
      <Card className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Catalog
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Products are a platform-wide reference catalog. Cooperatives pick from it when recording
            intake and listings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Product name
            <input
              className="ds-search"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sesame seed"
              required
              minLength={2}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Slug
            <input
              className="ds-search"
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="auto from name (optional)"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active (available to cooperatives and buyers)
        </label>

        <div>
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? 'Adding…' : 'Add product'}
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
      </Card>
    </form>
  );
}