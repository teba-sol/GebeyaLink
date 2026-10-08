import { Button, GradeMark, Quantity } from '@/features/ui';

/**
 * Section 5 — collection agent: fast touch-first field workflow
 * (responsive web now; offline sync later in the Expo app).
 */
export function AgentScreen() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-card border border-line-strong bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="font-mono text-[0.625rem] font-semibold tracking-[0.14em] text-ink-faint uppercase">
              Collection agent
            </p>
            <p className="font-display text-base font-semibold">
              Besheno Collection Center
            </p>
          </div>
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-[0.625rem] font-semibold text-accent">
            STEP 2/3
          </span>
        </div>

        <ol className="flex items-center gap-2" aria-label="Delivery capture progress">
          {[
            ['Farmer', 'done'],
            ['Weight', 'current'],
            ['Confirm', 'todo'],
          ].map(([label, state], index) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5">
              <span
                className="h-1 rounded-full"
                style={{
                  background:
                    state === 'todo' ? 'var(--surface-2)' : 'var(--accent)',
                }}
                aria-hidden="true"
              />
              <span
                className={`font-mono text-[0.625rem] ${state === 'todo' ? 'text-ink-faint' : 'font-semibold text-ink'}`}
              >
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between rounded-card border border-line bg-paper px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Abebe Kebede</p>
            <p className="font-mono text-[0.6875rem] text-ink-faint">
              Farmer F-193 · Ada’a
            </p>
          </div>
          <GradeMark grade="A" size="sm" />
        </div>

        <div className="flex flex-col items-center gap-1 rounded-card border border-line bg-paper py-4">
          <span className="font-mono text-4xl font-semibold tabular-nums">
            1,250
          </span>
          <span className="font-mono text-[0.625rem] font-semibold tracking-[0.16em] text-ink-faint uppercase">
            kilograms net
          </span>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              aria-label="Decrease weight"
              className="flex size-14 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-2xl"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Increase weight"
              className="flex size-14 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-2xl"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-soft">
            Quality grade
          </span>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quality grade">
            {(['A', 'B', 'C', 'REJECTED'] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                aria-pressed={grade === 'A'}
                className={`flex h-14 items-center justify-center rounded-btn border font-mono text-lg font-bold transition-colors ${
                  grade === 'A'
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line-strong bg-surface text-ink-soft'
                }`}
              >
                {grade === 'REJECTED' ? '×' : grade}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="text-ink-soft">Will record</span>
          <span className="font-mono font-semibold">
            <Quantity value={1_250} unit="kg" size="sm" /> · Grade A
          </span>
        </div>

        <Button size="touch" className="w-full">
          Record delivery
        </Button>
        <p className="text-center text-[0.6875rem] text-ink-faint">
          Works offline · syncs when connected
        </p>
      </div>

      <div className="flex max-w-md flex-col justify-center gap-4">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Touch &amp; field rules
        </p>
        <ul className="flex list-none flex-col gap-3 text-sm text-ink-soft">
          <li className="border-b border-line pb-3">
            Targets ≥ 56 px — weight, grade and confirm actions are one-thumb
            reachable.
          </li>
          <li className="border-b border-line pb-3">
            One decision per screen — farmer → weight → grade → confirm, never a
            form wall.
          </li>
          <li className="border-b border-line pb-3">
            Quantity is the hero — the net weight is the largest element on the
            screen.
          </li>
          <li>
            Status mirrors the inventory lifecycle: recorded deliveries become
            lot stock at the center.
          </li>
        </ul>
      </div>
    </div>
  );
}
