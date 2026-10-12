import Link from 'next/link';

import { Card, GradeMark, Quantity, StatusMark } from '@/features/ui';
import { formatDateTime } from '@/lib/format';

import type { CoopOrderView } from '../queries';
import { AcceptReject } from './accept-reject';
import { ResponseDeadline } from './response-deadline';

/**
 * One incoming-order entry. PENDING orders get live deadline + accept/reject
 * controls inline; everything later in the journey links through to the
 * detail screen (payment verification lives there).
 */
export function OrderCard({
  order,
  productName,
}: {
  order: CoopOrderView;
  productName: string;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-display text-lg font-semibold">{productName}</h4>
            <GradeMark grade={order.qualityGrade} size="sm" />
          </div>
          <p className="text-sm text-ink-soft">
            {order.buyerName ?? 'Buyer'} · {order.cooperativeName} · placed{' '}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Quantity value={order.quantity} unit="kg" size="md" />
          <StatusMark status={order.status} />
        </div>
      </div>

      {order.status === 'PENDING' ? (
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          <ResponseDeadline expiresAt={order.expiresAt} />
          <AcceptReject orderId={order.id} />
        </div>
      ) : order.status === 'ACCEPTED' && order.paymentStatus === 'PENDING' ? (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="rounded-btn border border-line bg-surface-2 px-3 py-2 text-xs text-ink-soft">
            Buyer reports payment — verify receipt to mark the order paid.
          </p>
          <Link
            href={`/ops/orders/${order.id}`}
            className="rounded-btn border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2"
          >
            View details
          </Link>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          {order.paymentStatus === 'FAILED' ? (
            <p className="text-xs text-ink-soft">
              Last payment attempt failed — buyer may resubmit.
            </p>
          ) : null}
          <Link
            href={`/ops/orders/${order.id}`}
            className="rounded-btn border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2"
          >
            View details
          </Link>
        </div>
      )}
    </Card>
  );
}