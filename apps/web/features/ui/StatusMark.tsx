import type {
  InventoryStatus,
  OrderStatus,
  PaymentStatus,
} from '@gebeyalink/types';

export type StatusToken =
  | 'available'
  | 'reserved'
  | 'committed'
  | 'dispatched'
  | 'sold'
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'failed';

export type DomainStatus = InventoryStatus | OrderStatus | PaymentStatus;

const TOKENS: Record<DomainStatus, StatusToken> = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  COMMITTED: 'committed',
  DISPATCHED: 'dispatched',
  SOLD: 'sold',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PAYMENT_CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
};

const LABELS: Record<StatusToken, string> = {
  available: 'Available',
  reserved: 'Reserved',
  committed: 'Committed',
  dispatched: 'Dispatched',
  sold: 'Sold',
  pending: 'Pending',
  accepted: 'Accepted',
  confirmed: 'Payment confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export function statusToken(status: DomainStatus): StatusToken {
  return TOKENS[status];
}

export function statusLabel(status: DomainStatus): string {
  return LABELS[TOKENS[status]];
}

type StatusMarkProps = {
  status: DomainStatus;
  label?: string;
};

/** Shape + label + color — status is never communicated by color alone. */
export function StatusMark({ status, label }: StatusMarkProps) {
  const token = TOKENS[status];
  return (
    <span className="status-mark" data-status={token}>
      <span className="status-mark__swatch" aria-hidden="true" />
      <span>{label ?? LABELS[token]}</span>
    </span>
  );
}
