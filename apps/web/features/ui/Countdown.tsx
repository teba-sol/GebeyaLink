type CountdownProps = {
  /** Human label, e.g. "Cooperative response window". */
  label: string;
  /** Pre-formatted remaining time, e.g. "12:43:09". */
  remaining: string;
  urgency?: 'ok' | 'soon' | 'critical';
};

/** 24-hour order response window rendered as a live-feeling deadline block. */
export function Countdown({ label, remaining, urgency = 'ok' }: CountdownProps) {
  return (
    <div
      className="countdown inline-flex flex-col gap-1 rounded-card border border-line bg-surface px-4 py-3"
      data-urgency={urgency}
    >
      <span className="countdown__label text-[0.6875rem] font-semibold tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="countdown__value font-mono text-xl font-semibold tabular-nums">
        {remaining}
      </span>
    </div>
  );
}
