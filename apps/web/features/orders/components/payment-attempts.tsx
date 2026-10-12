import type { PaymentDto } from '@gebeyalink/types';

import { StatusMark } from '@/features/ui';
import { formatBirr, formatDateTime } from '@/lib/format';
import { methodLabel } from './journey';

/** Every recorded payment attempt, newest first. */
export function PaymentAttempts({ attempts }: { attempts: PaymentDto[] }) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-btn border border-dashed border-line-strong px-4 py-3 text-xs text-ink-faint">
        No payment recorded yet.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {attempts.map((attempt) => (
        <li
          key={attempt.id}
          className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {methodLabel(attempt.method)}
              {attempt.reference ? (
                <span className="ml-1.5 font-mono text-xs text-ink-faint">
                  · {attempt.reference}
                </span>
              ) : null}
            </span>
            <StatusMark status={attempt.status} />
          </div>
          <div className="flex items-center justify-between gap-3 font-mono text-xs text-ink-soft">
            <span>{formatBirr(attempt.amount)}</span>
            <time>{formatDateTime(attempt.createdAt)}</time>
          </div>
          {attempt.failureReason ? (
            <p className="rounded-btn bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger">
              {attempt.failureReason}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}