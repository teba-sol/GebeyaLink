/**
 * Audit event types — C5 (docs/prd.md §47 Auditability).
 *
 * Important order/payment state changes are recorded in the same
 * transaction as the change itself. Events are append-only evidence:
 * they carry no foreign keys so they survive entity deletion.
 */

export const AUDIT_EVENT_TYPES = [
  'order.placed',
  'order.accepted',
  'order.rejected',
  'order.expired',
  'order.cancelled',
  'order.completed',
  'order.disputed',
  'payment.submitted',
  'payment.confirmed',
  'payment.failed',
  'shipment.created',
  'shipment.transporter_assigned',
  'shipment.pickup_confirmed',
  'shipment.dispatched',
  'shipment.delivered',
  'shipment.delivery_confirmed',
  'shipment.cancelled',
  'dispute.opened',
  'dispute.responded',
  'dispute.resolved',
  'dispute.rejected',
  'verification.submitted',
  'verification.under_review',
  'verification.approved',
  'verification.rejected',
  'verification.suspended',
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type AuditEntity =
  | 'order'
  | 'payment'
  | 'cooperative'
  | 'buyer'
  | 'transporter'
  | 'shipment'
  | 'dispute';
