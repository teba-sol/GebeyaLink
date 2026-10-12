import Link from 'next/link';

import type { OrderDto } from '@gebeyalink/types';

import { GradeMark, Quantity, StatusMark } from '@/features/ui';
import { formatBirr, formatDateTime } from '@/lib/format';
import { ResponseCountdown } from './response-countdown';

/** Order row for the buyer's order list — journey link + live countdown. */
export function OrderCard({ order, name }: { order: OrderDto; name: string }) {
  return (
    <article className="listing-card flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="lc-head flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GradeMark grade={order.qualityGrade} size="sm" />
        </div>
        <StatusMark status={order.status} />
      </div>
      <h3 className="lc-title font-display text-xl font-semibold">{name}</h3>
      <div className="lc-qty flex flex-col gap-1.5">
        <span className="text-sm text-ink-soft">
          <Quantity value={order.quantity} unit="kg" size="sm" /> ·{' '}
          {formatBirr(order.productTotal)}
        </span>
        <time className="text-xs text-ink-faint">
          Placed {formatDateTime(order.createdAt)}
        </time>
      </div>
      {order.status === 'PENDING' ? <ResponseCountdown expiresAt={order.expiresAt} /> : null}
      <div className="lc-foot flex items-center justify-between border-t border-line pt-3 text-xs">
        <span className="text-ink-faint">
          {formatBirr(order.unitPrice)} / kg
        </span>
        <Link
          href={`/orders/${order.id}`}
          className="font-semibold text-ink-soft hover:text-ink"
        >
          Open journey →
        </Link>
      </div>
    </article>
  );
}