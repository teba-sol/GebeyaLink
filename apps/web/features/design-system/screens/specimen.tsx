import {
  Button,
  Chip,
  Countdown,
  GradeMark,
  Quantity,
  StatusMark,
} from '@/features/ui';
import type { DomainStatus } from '@/features/ui';

const PALETTE = [
  { name: 'paper', token: '--paper' },
  { name: 'surface', token: '--surface' },
  { name: 'surface-2', token: '--surface-2' },
  { name: 'ink', token: '--ink' },
  { name: 'accent', token: '--accent' },
  { name: 'accent-soft', token: '--accent-soft' },
  { name: 'attention', token: '--attention' },
  { name: 'danger', token: '--danger' },
] as const;

const STATUS_VOCABULARY: DomainStatus[] = [
  'AVAILABLE',
  'RESERVED',
  'COMMITTED',
  'DISPATCHED',
  'SOLD',
  'PENDING',
  'ACCEPTED',
  'PAYMENT_CONFIRMED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
];

/** Section 0 — type, palette, status/quantity language, controls. */
export function Specimen() {
  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Typography
          </p>
          <p className="font-display text-5xl leading-[1.03] font-semibold">
            From farm lot to delivered order
          </p>
          <p className="font-display text-2xl font-semibold">
            Headline · commodity &amp; journey
          </p>
          <p className="max-w-[52ch] text-ink-soft">
            Body copy carries the operational detail — origin, cooperative,
            quantity, response window — with clear hierarchy against the
            display voice.
          </p>
          <p className="font-mono text-xs text-ink-faint">
            12,400 ETB/qt · 84,000 kg available · 04:12:33 remaining
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Palette
          </p>
          <div className="grid grid-cols-4 gap-3">
            {PALETTE.map((swatch) => (
              <div key={swatch.token}>
                <div
                  className="h-14 border border-line"
                  style={{ background: `var(${swatch.token})` }}
                />
                <p className="mt-1 font-mono text-[0.625rem] text-ink-faint">
                  {swatch.name}
                </p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Quantity
          </p>
          <div className="flex flex-wrap items-baseline gap-4">
            <Quantity value={84_000} unit="kg" size="xl" />
            <Quantity value={5_000} unit="kg" size="lg" />
            <Quantity value={1_250} unit="kg" size="md" />
            <span className="font-mono text-sm text-ink-soft">
              <span className="text-ink-faint">ETB</span>{' '}
              <span className="font-semibold">12,400</span>/qt
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Status vocabulary — shape + label + color
        </p>
        <div className="flex flex-wrap gap-2.5">
          {STATUS_VOCABULARY.map((status) => (
            <StatusMark key={status} status={status} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Grades &amp; deadlines
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <GradeMark grade="A" />
          <GradeMark grade="B" />
          <GradeMark grade="C" />
          <GradeMark grade="REJECTED" />
          <Countdown label="Response window" remaining="12:43:09" />
          <Countdown label="Response window" remaining="04:12:33" urgency="soon" />
          <Countdown label="Response window" remaining="00:47:10" urgency="critical" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Controls
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Place order</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Reject order</Button>
          <Button size="touch">Record delivery</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip selected>Teff</Chip>
          <Chip>Wheat</Chip>
          <Chip>Maize</Chip>
          <Chip>Coffee</Chip>
          <Chip>Grade A</Chip>
          <Chip>Oromia</Chip>
        </div>
      </div>
    </>
  );
}
