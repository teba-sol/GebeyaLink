'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type {
  CollectionCenterDto,
  DeliveryDto,
  DeliveryQualityGrade,
  FarmerDto,
  ProductDto,
} from '@gebeyalink/types';

import { Button, Card, Chip } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';
import { formatKg } from '@/lib/format';

type StepId = 'farmer' | 'weight' | 'review';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'farmer', label: 'Farmer' },
  { id: 'weight', label: 'Weight' },
  { id: 'review', label: 'Confirm' },
];

const GRADES: DeliveryQualityGrade[] = ['A', 'B', 'C', 'REJECTED'];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type RecordDeliveryProps = {
  centers: CollectionCenterDto[];
  farmers: FarmerDto[];
  products: ProductDto[];
  initialCenterId?: string;
};

/**
 * Delivery capture stepper (F3): one decision per screen —
 * farmer → weight & grade → confirm. Mirrors the locked /design-system
 * collection-agent reference. The API re-validates the single snapshot
 * (accepted + rejected must equal measured; REJECTED must carry no accepted
 * quantity), so A/B/C record the full measured weight and REJECTED records
 * the measured weight as rejected.
 */
export function RecordDelivery({
  centers,
  farmers,
  products,
  initialCenterId,
}: RecordDeliveryProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const presetCenter = centers.find((center) => center.id === initialCenterId) ?? centers[0];
  const [centerId, setCenterId] = useState(presetCenter?.id ?? '');
  const selectedCenter = centers.find((center) => center.id === centerId) ?? null;

  const [step, setStep] = useState<StepId>('farmer');
  const [query, setQuery] = useState('');
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [claimedKg, setClaimedKg] = useState(0);
  const [measuredKg, setMeasuredKg] = useState(0);
  const [grade, setGrade] = useState<DeliveryQualityGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DeliveryDto | null>(null);

  const normalized = query.trim().toLowerCase();
  const matches = farmers.filter((farmer) =>
    [farmer.name, farmer.phone, farmer.location]
      .filter(Boolean)
      .some((part) => part!.toLowerCase().includes(normalized)),
  );
  const selectedFarmer = farmers.find((farmer) => farmer.id === farmerId) ?? null;
  const selectedProduct = products.find((product) => product.id === productId) ?? null;

  const cooperativeId = selectedCenter?.cooperativeId ?? '';
  const acceptedKg = grade === 'REJECTED' ? 0 : measuredKg;
  const rejectedKg = grade === 'REJECTED' ? measuredKg : 0;

  const reset = () => {
    setStep('farmer');
    setQuery('');
    setFarmerId(null);
    setProductId(null);
    setClaimedKg(0);
    setMeasuredKg(0);
    setGrade(null);
    setError(null);
    setDone(null);
  };

  const run = (task: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  };

  const createFarmer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (!cooperativeId || !name) return;
    setCreating(true);
    run(async () => {
      const farmer = await api.createFarmer({
        cooperativeId,
        name,
        phone: newPhone.trim() || null,
        location: newLocation.trim() || null,
      });
      farmers.push(farmer);
      setFarmerId(farmer.id);
      setNewName('');
      setNewPhone('');
      setNewLocation('');
      setCreating(false);
    });
  };

  const record = () => {
    if (!selectedCenter || !farmerId || !productId || !grade || measuredKg <= 0) return;
    run(async () => {
      const delivery = await api.createDelivery({
        cooperativeId,
        collectionCenterId: selectedCenter.id,
        farmerId,
        productId,
        claimedQuantity: claimedKg,
        measuredQuantity: measuredKg,
        acceptedQuantity: acceptedKg,
        rejectedQuantity: rejectedKg,
        qualityGrade: grade,
      });
      setDone(delivery);
    });
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goTo = (target: StepId) => setStep(target);

  if (centers.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">
          No active collection centers are assigned to your cooperative yet. Ask a
          cooperative administrator to register the center first.
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="flex flex-col items-stretch gap-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-st-available text-white"
          >
            ✓
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Delivery recorded</p>
            <p className="text-xs text-ink-soft">
              {selectedCenter?.name ?? 'Collection center'} · {formatDate(done.deliveryDate)}
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-2 rounded-card border border-line bg-paper p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Farmer</dt>
            <dd className="font-medium">{selectedFarmer?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Commodity</dt>
            <dd className="font-medium">{selectedProduct?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Will record</dt>
            <dd className="font-mono font-semibold">
              {done.acceptedQuantity > 0
                ? `${formatKg(done.acceptedQuantity)} kg · grade ${done.qualityGrade}`
                : `${formatKg(done.rejectedQuantity)} kg rejected`}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Button
            size="touch"
            disabled={pending}
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            Record another
          </Button>
          <Button
            variant="secondary"
            size="touch"
            disabled={pending}
            onClick={() => router.push('/agent')}
          >
            Back to today
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.625rem] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Collection agent
          </p>
          <p className="truncate font-display text-base font-semibold">
            {selectedCenter?.name ?? 'Pick a collection center'}
          </p>
        </div>
        <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-[0.625rem] font-semibold text-accent">
          STEP {stepIndex + 1}/3
        </span>
      </div>

      <ol className="flex items-center gap-2" aria-label="Delivery capture progress">
        {STEPS.map((item, index) => {
          const state = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo';
          return (
            <li key={item.id} className="flex flex-1 flex-col gap-1.5">
              <span
                className="h-1 rounded-full"
                style={{
                  background: state === 'todo' ? 'var(--surface-2)' : 'var(--accent)',
                }}
                aria-hidden="true"
              />
              <span
                className={`font-mono text-[0.625rem] ${state === 'todo' ? 'text-ink-faint' : 'font-semibold text-ink'}`}
              >
                {index + 1}. {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      {!selectedCenter ? (
        <div className="flex flex-col gap-2" role="group" aria-label="Collection center">
          <p className="text-xs font-semibold text-ink-soft">Collection center</p>
          <div className="grid gap-2">
            {centers.map((center) => (
              <button
                key={center.id}
                type="button"
                onClick={() => setCenterId(center.id)}
                className="flex min-h-12 items-center justify-between gap-3 rounded-btn border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2"
              >
                <span>{center.name}</span>
                <span aria-hidden="true" className="font-mono text-xs text-ink-faint">
                  {center.location ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 'farmer' ? (
        <div className="flex flex-col gap-4">
          {selectedCenter?.location ? (
            <p className="text-xs text-ink-soft">{selectedCenter.location}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="sr-only" htmlFor="farmer-search">
              Search farmers
            </label>
            <input
              id="farmer-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or phone"
              className="ds-search h-12 w-full text-base"
            />
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-card border border-dashed border-line-strong px-4 py-6 text-center">
              <p className="text-sm text-ink-soft">
                {query ? `No farmers match “${query.trim()}”.` : 'No farmers registered yet.'}
              </p>
              <p className="text-xs text-ink-faint">Register the farmer to start recording.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2" role="group" aria-label="Farmer">
              {matches.map((farmer) => (
                <button
                  key={farmer.id}
                  type="button"
                  aria-pressed={farmer.id === farmerId}
                  onClick={() => setFarmerId(farmer.id)}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-btn border px-4 py-3 text-left transition-colors ${
                    farmer.id === farmerId
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{farmer.name}</span>
                    <span className="block truncate font-mono text-xs text-ink-soft">
                      {farmer.phone ?? 'No phone'}
                      {farmer.phone && farmer.location ? ` · ${farmer.location}` : ''}
                    </span>
                  </span>
                  <span aria-hidden="true" className="font-mono text-lg">
                    {farmer.id === farmerId ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          <details className="rounded-card border border-line bg-surface-2">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-semibold">
              Register a new farmer
            </summary>
            <form onSubmit={createFarmer} className="flex flex-col gap-3 border-t border-line p-4">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
                Full name
                <input
                  className="ds-search h-12 text-base"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Abebe Kebede"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
                Phone (optional)
                <input
                  className="ds-search h-12 text-base"
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  placeholder="09•• ••• •••"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
                Location (optional)
                <input
                  className="ds-search h-12 text-base"
                  value={newLocation}
                  onChange={(event) => setNewLocation(event.target.value)}
                  placeholder="e.g. Ada’a woreda"
                />
              </label>
              <Button size="md" type="submit" disabled={creating || !newName.trim()}>
                {creating ? 'Registering…' : 'Register & select'}
              </Button>
            </form>
          </details>

          {error ? (
            <p
              className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 'weight' ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-ink-soft">Commodity</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Commodity">
              {products.map((product) => (
                <Chip
                  key={product.id}
                  selected={productId === product.id}
                  onClick={() => setProductId(product.id)}
                  className="h-11 px-4 text-sm"
                >
                  {product.name}
                </Chip>
              ))}
            </div>
            {products.length === 0 ? (
              <p className="text-xs text-ink-faint">No products in the catalog yet.</p>
            ) : null}
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
            Farmer claimed (kg)
            <input
              type="text"
              inputMode="decimal"
              value={claimedKg === 0 ? '' : String(claimedKg)}
              onChange={(event) => setClaimedKg(parseFloat(event.target.value) || 0)}
              placeholder="0"
              className="ds-search h-12 w-full text-base"
            />
          </label>

          <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-paper py-5">
            <span className="font-mono text-4xl font-semibold tabular-nums">
              {formatKg(measuredKg)}
            </span>
            <span className="font-mono text-[0.625rem] font-semibold tracking-[0.16em] text-ink-faint uppercase">
              kilograms net
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Decrease measured weight"
                className="flex size-14 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-2xl"
                onClick={() => setMeasuredKg(Math.max(0, measuredKg - 25))}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Increase measured weight"
                className="flex size-14 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-2xl"
                onClick={() => setMeasuredKg(measuredKg + 25)}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-ink-soft">Quality grade</p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quality grade">
              {GRADES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={grade === option}
                  className={`flex h-14 items-center justify-center rounded-btn border font-mono text-lg font-bold transition-colors ${
                    grade === option
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line-strong bg-surface text-ink-soft'
                  }`}
                  onClick={() => setGrade(option)}
                >
                  {option === 'REJECTED' ? '×' : option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-soft">Will record</span>
            <span className="font-mono font-semibold">
              {grade
                ? `${formatKg(grade === 'REJECTED' ? 0 : measuredKg)} kg${
                    grade === 'REJECTED' ? ' rejected' : ` · Grade ${grade}`
                  }`
                : '—'}
            </span>
          </div>
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2 rounded-card border border-line bg-paper p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Center</dt>
              <dd className="text-right font-medium">{selectedCenter?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Farmer</dt>
              <dd className="text-right font-medium">{selectedFarmer?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Commodity</dt>
              <dd className="text-right font-medium">{selectedProduct?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Claimed</dt>
              <dd className="font-mono font-semibold">{formatKg(claimedKg)} kg</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Measured net</dt>
              <dd className="font-mono font-semibold">{formatKg(measuredKg)} kg</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Grade</dt>
              <dd className="font-mono font-semibold">
                {grade === 'REJECTED' ? 'Rejected' : `Grade ${grade}`}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2">
              <dt className="text-ink-soft">Will record</dt>
              <dd className="font-mono font-semibold">
                {acceptedKg > 0
                  ? `${formatKg(acceptedKg)} kg accepted`
                  : `${formatKg(rejectedKg)} kg rejected`}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-ink-faint">
            Accepted deliveries add stock to the center&apos;s lot; a rejected delivery never
            creates inventory.
          </p>

          {error ? (
            <p
              className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="touch"
          disabled={step === 'farmer' || pending}
          onClick={() => goTo(STEPS[Math.max(0, stepIndex - 1)].id)}
        >
          Back
        </Button>
        {step === 'review' ? (
          <Button size="touch" disabled={pending} onClick={record} className="min-w-40">
            {pending ? 'Recording…' : 'Record delivery'}
          </Button>
        ) : (
          <Button
            size="touch"
            disabled={
              pending ||
              (step === 'farmer' && !farmerId) ||
              (step === 'weight' && (!productId || !grade || measuredKg <= 0))
            }
            onClick={() => goTo(STEPS[Math.min(2, stepIndex + 1)].id)}
            className="min-w-40"
          >
            Continue
          </Button>
        )}
      </div>

      <p className="text-center text-[0.6875rem] text-ink-faint">
        Works offline · syncs when connected
      </p>
    </div>
  );
}