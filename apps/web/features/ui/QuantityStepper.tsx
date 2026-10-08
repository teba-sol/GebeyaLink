'use client';

import { useState } from 'react';

type QuantityStepperProps = {
  minKg: number;
  stepKg?: number;
  initialKg?: number;
  availableKg: number;
};

/**
 * Order quantity selector: MOQ floor + availability ceiling, large targets
 * for touch. (Prototype — wiring to the place-order mutation happens in F1.)
 */
export function QuantityStepper({
  minKg,
  stepKg = 500,
  initialKg = minKg,
  availableKg,
}: QuantityStepperProps) {
  const [kg, setKg] = useState(initialKg);

  const clamp = (next: number) => Math.min(availableKg, Math.max(minKg, next));
  const belowMin = kg < minKg;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label="Decrease quantity by 500 kilograms"
          className="flex size-12 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-lg text-ink hover:bg-surface-2"
          onClick={() => setKg((q) => clamp(q - stepKg))}
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-btn border border-line bg-surface px-2 py-2">
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {new Intl.NumberFormat('en-US').format(kg)}
          </span>
          <span className="text-[0.625rem] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            kilograms
          </span>
        </div>
        <button
          type="button"
          aria-label="Increase quantity by 500 kilograms"
          className="flex size-12 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-lg text-ink hover:bg-surface-2"
          onClick={() => setKg((q) => clamp(q + stepKg))}
        >
          +
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        Minimum order{' '}
        <span className="font-mono font-semibold">
          {new Intl.NumberFormat('en-US').format(minKg)} kg
        </span>
        {' · '}
        <span className="font-mono font-semibold">
          {new Intl.NumberFormat('en-US').format(availableKg)} kg
        </span>{' '}
        available
        {belowMin ? (
          <span className="ml-1 font-semibold text-danger">
            — below minimum
          </span>
        ) : null}
      </p>
    </div>
  );
}
