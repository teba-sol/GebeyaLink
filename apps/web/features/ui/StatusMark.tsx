import type {
  InventoryStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
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
  | 'failed'
  | 'completed'
  | 'disputed'
  | 'transport_pending'
  | 'pickup_pending'
  | 'pickup_confirmed'
  | 'in_transit'
  | 'delivered'
  | 'delayed';

export type DomainStatus = InventoryStatus | OrderStatus | PaymentStatus | ShipmentStatus;

const TOKENS: Record<DomainStatus, StatusToken> = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  COMMITTED: 'committed',
  DISPATCHED: 'dispatched',
  SOLD: 'sold',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PAYMENT_CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  TRANSPORT_PENDING: 'transport_pending',
  PICKUP_PENDING: 'pickup_pending',
  PICKUP_CONFIRMED: 'pickup_confirmed',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  DELIVERY_CONFIRMED: 'completed',
  DELAYED: 'delayed',
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
  completed: 'Completed',
  disputed: 'Disputed',
  transport_pending: 'Transport pending',
  pickup_pending: 'Pickup pending',
  pickup_confirmed: 'Pickup confirmed',
  in_transit: 'In transit',
  delivered: 'Delivered',
  delayed: 'Delayed',
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
