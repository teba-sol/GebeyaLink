'use client';

import { useState } from 'react';

type QuantityStepperProps = {
  minKg: number;
  stepKg?: number;
  initialKg?: number;
  availableKg: number;
  onChange?: (kg: number) => void;
};

/**
 * Order quantity selector: MOQ floor + availability ceiling, large targets
 * for touch. Reports the selected quantity via `onChange` for totals.
 */
export function QuantityStepper({
  minKg,
  stepKg = 500,
  initialKg = minKg,
  availableKg,
  onChange,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(availableKg, Math.max(minKg, next));
  const [kg, setKg] = useState(() => clamp(initialKg));

  const canDecrease = kg > minKg;
  const canIncrease = kg < availableKg;
  const belowMin = kg < minKg;

  const change = (next: number) => {
    const value = clamp(next);
    setKg(value);
    onChange?.(value);
  };

  const buttonBase =
    'flex size-12 items-center justify-center rounded-btn border border-line-strong bg-surface font-mono text-lg text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-line disabled:text-ink-faint disabled:hover:bg-surface';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label="Decrease quantity by 500 kilograms"
          disabled={!canDecrease}
          className={buttonBase}
          onClick={() => change(kg - stepKg)}
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
          disabled={!canIncrease}
          className={buttonBase}
          onClick={() => change(kg + stepKg)}
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
            — below the minimum order
          </span>
        ) : null}
      </p>
    </div>
  );
}
