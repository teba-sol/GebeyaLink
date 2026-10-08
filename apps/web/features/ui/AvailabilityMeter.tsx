import { Quantity } from './Quantity';
import type { StatusToken } from './StatusMark';

type Segment = {
  token: StatusToken;
  label: string;
  kg: number;
};

type AvailabilityMeterProps = {
  totalKg: number;
  segments: Segment[];
};

/**
 * Inventory lifecycle at a glance: available / reserved / committed / …
 * rendered as one stacked bar plus a numeric legend.
 */
export function AvailabilityMeter({ totalKg, segments }: AvailabilityMeterProps) {
  const visible = segments.filter((s) => s.kg > 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="meter__track"
        role="img"
        aria-label={visible
          .map((s) => `${s.label}: ${s.kg} kilograms`)
          .join(', ')}
      >
        {visible.map((s) => (
          <span
            key={s.token}
            className="meter__seg"
            data-status={s.token}
            style={{ width: `${(s.kg / totalKg) * 100}%` }}
          />
        ))}
      </div>
      <ul className="meter__legend">
        {visible.map((s) => (
          <li key={s.token} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 shrink-0"
              data-status={s.token}
              style={{ background: 'var(--status-color)' }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-ink-soft">{s.label}</span>
            <Quantity value={s.kg} unit="kg" size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}
