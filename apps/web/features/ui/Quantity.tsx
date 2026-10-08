type QuantityProps = {
  value: number;
  unit: 'kg' | 't' | 'qt';
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl',
} as const;

/** Weight-forward number display: tabular figures + explicit unit. */
export function Quantity({ value, unit, size = 'md' }: QuantityProps) {
  const formatted = new Intl.NumberFormat('en-US').format(value);
  return (
    <span className={`qty inline-flex items-baseline gap-1 ${SIZES[size]}`}>
      <span className="qty__value font-mono font-semibold tabular-nums">
        {formatted}
      </span>
      <span className="qty__unit font-mono text-ink-faint">{unit}</span>
    </span>
  );
}
