import type { OrderDto } from '@gebeyalink/types';

import { Card, GradeMark, Quantity } from '@/features/ui';
import { formatBirr, formatDateTime } from '@/lib/format';

/** Compact order facts for the journey page's rail. */
export function OrderSummary({
  order,
  productName,
}: {
  order: OrderDto;
  productName: string;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
        Order summary
      </p>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-soft">{productName}</span>
      </div>
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-soft">Quantity</dt>
          <dd>
            <Quantity value={order.quantity} unit="kg" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-soft">Grade</dt>
          <dd className="flex items-center gap-2">
            <GradeMark grade={order.qualityGrade} size="sm" /> {order.qualityGrade}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-soft">Unit price</dt>
          <dd className="font-mono font-semibold">
            {formatBirr(order.unitPrice)} / kg
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="font-mono font-bold">{formatBirr(order.productTotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-soft">Ordered</dt>
          <dd className="font-mono text-xs text-ink-soft">
            {formatDateTime(order.createdAt)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}