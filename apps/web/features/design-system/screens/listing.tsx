import {
  AvailabilityMeter,
  Button,
  GradeMark,
  Quantity,
  QuantityStepper,
} from '@/features/ui';
import { LISTINGS, MIN_ORDER_KG, ORDER_FIXTURE } from '../data';

const DETAIL = LISTINGS[0];

/** Section 2 — listing detail: availability + quantity/MOQ decision. */
export function ListingScreen() {
  const reservedKg = 8_000;
  const committedKg = 6_000;
  const dispatchedKg = 2_000;
  const subtotal =
    (DETAIL.pricePerQt / 100) * (MIN_ORDER_KG * 4);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <GradeMark grade={DETAIL.grade} />
            <span className="font-mono text-xs text-ink-faint">{DETAIL.id}</span>
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              Active listing
            </span>
          </div>
          <h1 className="font-display text-4xl leading-tight font-semibold">
            {DETAIL.product} · Grade {DETAIL.grade}
          </h1>
          <p className="text-ink-soft">
            {DETAIL.origin} — 2026 season, stored at {DETAIL.cooperative}{' '}
            central warehouse. Weighed at intake, quality graded per lot.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Lot availability · {DETAIL.totalKg.toLocaleString('en-US')} kg total
          </p>
          <AvailabilityMeter
            totalKg={DETAIL.totalKg}
            segments={[
              { token: 'available', label: 'Available', kg: DETAIL.availableKg },
              { token: 'reserved', label: 'Reserved', kg: reservedKg },
              { token: 'committed', label: 'Committed', kg: committedKg },
              { token: 'dispatched', label: 'Dispatched', kg: dispatchedKg },
            ]}
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
          {[
            ['Price', `${DETAIL.pricePerQt.toLocaleString('en-US')} ETB/qt`],
            ['Grade', `${DETAIL.grade} (official)`],
            ['Cooperative', DETAIL.cooperative],
            ['Response window', '24 hours'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-faint">{label}</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <aside className="flex flex-col gap-6 self-start rounded-card border border-line bg-surface p-6 shadow-card lg:sticky lg:top-6">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Place order
        </p>
        <QuantityStepper
          minKg={MIN_ORDER_KG}
          stepKg={500}
          initialKg={MIN_ORDER_KG * 4}
          availableKg={DETAIL.availableKg}
        />
        <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Unit price</dt>
            <dd className="font-mono font-semibold">
              {DETAIL.pricePerQt.toLocaleString('en-US')} ETB/qt
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">4,000 kg = 40 quintal</dt>
            <dd className="font-mono font-semibold">
              {subtotal.toLocaleString('en-US')} ETB
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-semibold">Subtotal</dt>
            <dd className="font-mono font-bold">
              {subtotal.toLocaleString('en-US')} ETB
            </dd>
          </div>
        </dl>
        <Button size="lg" className="w-full">
          Reserve stock &amp; order
        </Button>
        <p className="text-xs text-ink-soft">
          Stock is reserved the moment the order is placed. Payment reference is
          issued to the buyer — see the journey below.
        </p>
        <p className="flex items-center justify-between border-t border-line pt-3 font-mono text-xs text-ink-faint">
          <span>{ORDER_FIXTURE.id}</span>
          <span>
            <Quantity value={ORDER_FIXTURE.quantityKg} unit="kg" size="sm" />
          </span>
        </p>
      </aside>
    </div>
  );
}
