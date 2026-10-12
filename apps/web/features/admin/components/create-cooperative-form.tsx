'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Card } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Register a cooperative (F4 gap closure). Cooperatives are admin-created — the
 * API enforces `createCooperative` requires admin; this mirrors it for UX only.
 */
export function CreateCooperativeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [zone, setZone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');

  const canSubmit = name.trim().length >= 2;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const coop = await api.createCooperative({
          name: name.trim(),
          slug: slug.trim() || undefined,
          status,
          phone: phone.trim() || null,
          email: email.trim() || null,
          region: region.trim() || null,
          zone: zone.trim() || null,
          district: district.trim() || null,
          address: address.trim() || null,
        });
        router.push(`/admin/cooperatives/${coop.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  return (
    <form onSubmit={submit} aria-label="New cooperative" className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Details
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            The cooperative is created inactive-friendly: register it first, then
            activate once its staff are onboarded.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Cooperative name
          <input
            className="ds-search"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Besheno Farmers Cooperative"
            required
            minLength={2}
            autoFocus
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Slug (optional)
            <input
              className="ds-search font-mono"
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="auto-generated from name"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <div className="flex gap-2" role="group" aria-label="Status">
              {(['active', 'inactive'] as const).map((option) => (
                <label
                  key={option}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="cooperative-status"
                    value={option}
                    checked={status === option}
                    onChange={() => setStatus(option)}
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Phone
            <input
              className="ds-search"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+251 … (optional)"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <input
              className="ds-search"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coop@example.et (optional)"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Region
            <input
              className="ds-search"
              type="text"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="Oromia"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Zone
            <input
              className="ds-search"
              type="text"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              placeholder="Arsi"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            District
            <input
              className="ds-search"
              type="text"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Dodota"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Address
          <input
            className="ds-search"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street / area detail (optional)"
          />
        </label>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? 'Registering…' : 'Register cooperative'}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => router.back()}>
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
  );
}