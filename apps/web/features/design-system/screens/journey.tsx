import {
  Card,
  Countdown,
  GradeMark,
  JourneyStepper,
  Quantity,
  StatusMark,
} from '@/features/ui';
import { ORDER_FIXTURE } from '../data';

/** Section 3 — order journey as timeline/progress, not a status table. */
export function JourneyScreen() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <Card padding="lg" className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              Order {ORDER_FIXTURE.id}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">
              {ORDER_FIXTURE.product}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {ORDER_FIXTURE.buyer} → {ORDER_FIXTURE.cooperative}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusMark status="PENDING" />
            <Countdown {...ORDER_FIXTURE.countdown} />
          </div>
        </div>

        <JourneyStepper
          label={`Order ${ORDER_FIXTURE.id} journey`}
          steps={[
            {
              label: 'Order placed',
              state: 'done',
              description:
                '5,000 kg White Teff reserved from lot LOT-2419',
              timestamp: ORDER_FIXTURE.placedAt,
            },
            {
              label: 'Payment submitted',
              state: 'done',
              description: `Commercial paper ${ORDER_FIXTURE.paymentRef}`,
              timestamp: '08 Oct 2026 · 10:02',
            },
            {
              label: 'Payment confirmed',
              state: 'done',
              description: 'Confirmed by cooperative staff',
              timestamp: '08 Oct 2026 · 10:41',
            },
            {
              label: 'Cooperative acceptance',
              state: 'current',
              description: 'Awaiting response — deadline in 4h 12m',
            },
            {
              label: 'Pickup scheduled',
              state: 'todo',
              description: 'Collection from Besheno central warehouse',
            },
            {
              label: 'In transit',
              state: 'todo',
              description: 'Route: Ada’a → Addis Ababa (CBE-7)',
            },
            {
              label: 'Delivered & confirmed',
              state: 'todo',
              description: 'Buyer confirms weight and quality on arrival',
            },
          ]}
        />
      </Card>

      <div className="flex flex-col gap-6">
        <Card padding="md" className="flex flex-col gap-4">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Order summary
          </p>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-soft">Quantity</dt>
              <dd>
                <Quantity value={ORDER_FIXTURE.quantityKg} unit="kg" />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-soft">Grade</dt>
              <dd className="flex items-center gap-2">
                <GradeMark grade="A" size="sm" /> A
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-soft">Unit price</dt>
              <dd className="font-mono font-semibold">
                {ORDER_FIXTURE.pricePerQt.toLocaleString('en-US')} ETB/qt
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-mono font-bold">
                {((ORDER_FIXTURE.pricePerQt / 100) *
                  ORDER_FIXTURE.quantityKg).toLocaleString('en-US')}{' '}
                ETB
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          padding="md"
          className="flex flex-col gap-4"
          data-status="rejected"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              Order GL-2474 · rejected path
            </p>
            <StatusMark status="REJECTED" />
          </div>
          <JourneyStepper
            label="Rejected order journey"
            steps={[
              { label: 'Order placed', state: 'done', timestamp: '07 Oct · 15:20' },
              {
                label: 'Payment submitted',
                state: 'done',
                timestamp: '07 Oct · 16:05',
              },
              {
                label: 'Rejected by cooperative',
                state: 'error',
                description: 'Reason: quality issue — lot failed moisture re-check',
                timestamp: '07 Oct · 19:47',
              },
              { label: 'Stock released', state: 'done', description: '32,000 kg returned to available', timestamp: '07 Oct · 19:47' },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
