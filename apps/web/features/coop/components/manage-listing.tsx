'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import type { ListingStatus } from '@gebeyalink/types';

import { Button, Card, GradeMark, Quantity } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

import type { CoopInventoryLot } from '../queries';

const STATUS_OPTIONS: { value: ListingStatus; label: string; hint: string }[] = [
  { value: 'active', label: 'Active', hint: 'Visible and orderable on the marketplace' },
  { value: 'paused', label: 'Paused', hint: 'Hidden from buyers, price retained' },
  { value: 'closed', label: 'Closed', hint: 'Delisted — buyers can no longer order' },
];

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed * 1000) ? parsed : null;
}

/**
 * Publish an inventory lot to the marketplace, or manage its live listing
 * price/status. Mirrors server authz (createListing/updateListing require
 * cooperative_staff membership); the API re-checks everything.
 */
export function ListingControl({ lot }: { lot: CoopInventoryLot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(() => (lot.listing ? String(lot.listing.pricePerUnit) : ''));
  const [status, setStatus] = useState<ListingStatus>(lot.listing?.status ?? 'active');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const parsed = parsePrice(price);
  const canPublish = parsed !== null && lot.availableQuantity >= 0.001;
  const canSave = parsed !== null;

  const run = (task: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await task();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  const publish = () => {
    if (parsed === null) return;
    run(() => api.createListing({ inventoryLotId: lot.id, pricePerUnit: parsed }));
  };

  const save = () => {
    if (parsed === null || !lot.listing) return;
    const patch: { pricePerUnit?: number; status?: ListingStatus } = {};
    if (parsed !== lot.listing.pricePerUnit) patch.pricePerUnit = parsed;
    if (status !== lot.listing.status) patch.status = status;
    if (Object.keys(patch).length === 0) {
      setOpen(false);
      router.refresh();
      return;
    }
    run(() => api.updateListing(lot.listing!.id, patch));
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={pending}>
        {lot.listing ? 'Manage listing' : 'Publish'}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => !pending && setOpen(false)}
            aria-hidden="true"
          />
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-control-title"
            padding="lg"
            className="relative w-full max-w-md"
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
                  Marketplace listing
                </p>
                <h3 id="listing-control-title" className="mt-1 flex items-center gap-2 font-display text-xl font-semibold">
                  {lot.productName} <GradeMark grade={lot.qualityGrade} size="sm" />
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {lot.collectionCenterName} · {lot.collectionCenterLocation ?? 'location not set'}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                  Available <Quantity value={lot.availableQuantity} unit="kg" size="sm" />
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Price per kg (ETB)
                  <input
                    className="ds-search h-10 font-mono"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="e.g. 54.30"
                    aria-describedby={lot.listing ? undefined : 'listing-publish-hint'}
                  />
                </label>

                {lot.listing ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Status</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Listing status">
                      {STATUS_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer flex-col gap-0.5 rounded-btn border border-line bg-surface px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                        >
                          <span className="flex items-center gap-2 text-xs font-medium">
                            <input
                              type="radio"
                              name="listing-status"
                              value={option.value}
                              checked={status === option.value}
                              onChange={() => setStatus(option.value)}
                            />
                            {option.label}
                          </span>
                          <span className="pl-5 text-[0.6875rem] text-ink-faint">{option.hint}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p id="listing-publish-hint" className="text-[0.6875rem] text-ink-faint">
                    Publishing makes this lot orderable on the buyer marketplace at your price.
                  </p>
                )}
              </div>

              {lot.availableQuantity < 0.001 && !lot.listing ? (
                <p className="rounded-btn border border-line bg-surface-2 px-3 py-2 text-xs text-ink-soft">
                  This lot has no available stock yet — sellable quantity returns when a pending
                  order expires or is rejected.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                {lot.listing ? (
                  <Button size="sm" disabled={pending || !canSave} onClick={save}>
                    {pending ? 'Saving…' : 'Save changes'}
                  </Button>
                ) : (
                  <Button size="sm" disabled={pending || !canPublish} onClick={publish}>
                    {pending ? 'Publishing…' : 'Publish to marketplace'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>

              {error ? (
                <p className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}