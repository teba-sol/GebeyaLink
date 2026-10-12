import type { DeliveryStatus } from '@gebeyalink/types';

const TONE: Record<DeliveryStatus, string> = {
  RECEIVED: 'pending',
  WEIGHED: 'pending',
  QUALITY_CHECKED: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const LABELS: Record<DeliveryStatus, string> = {
  RECEIVED: 'Received',
  WEIGHED: 'Weighed',
  QUALITY_CHECKED: 'Quality checked',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

/** Delivery lifecycle status — same shape+label+color language as order status. */
export function DeliveryStatusMark({ status }: { status: DeliveryStatus }) {
  return (
    <span className="status-mark" data-status={TONE[status]}>
      <span className="status-mark__swatch" aria-hidden="true" />
      <span>{LABELS[status]}</span>
    </span>
  );
}