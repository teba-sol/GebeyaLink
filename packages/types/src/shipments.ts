/**
 * Shipment (transport + delivery) types — C6 (docs/prd.md §15–§18, §29).
 *
 * The order carries the commercial lifecycle (`OrderStatus`); transport and
 * fulfilment live here so a buyer's order can be `PAYMENT_CONFIRMED` while the
 * goods move. `ShipmentStatus` is the single source of truth for the delivery
 * journey the buyer tracks.
 */

export const SHIPMENT_STATUSES = [
  'TRANSPORT_PENDING',
  'PICKUP_PENDING',
  'PICKUP_CONFIRMED',
  'IN_TRANSIT',
  'DELIVERED',
  'DELIVERY_CONFIRMED',
  'DELAYED',
  'FAILED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Platform-registered transporter vs. an external party the coop names. */
export const SHIPMENT_TRANSPORTER_KINDS = ['platform', 'external'] as const;
export type ShipmentTransporterKind = (typeof SHIPMENT_TRANSPORTER_KINDS)[number];

export const SHIPMENT_CONDITIONS = ['good', 'minor_damage', 'damaged', 'spoiled'] as const;
export type ShipmentCondition = (typeof SHIPMENT_CONDITIONS)[number];

export type ShipmentDto = {
  id: string;
  orderId: string;
  cooperativeId: string;
  transporterId: string | null;
  transporterUserId: string | null;
  transporterKind: ShipmentTransporterKind;
  transporterName: string;
  transporterPhone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  pickupLocation: string;
  destination: string;
  transportCost: number | null;
  status: ShipmentStatus;
  scheduledPickupAt: string | null;
  expectedDeliveryAt: string | null;
  coopPickupConfirmedAt: string | null;
  transporterPickupConfirmedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  deliveryConfirmedAt: string | null;
  deliveryReceivedQuantity: number | null;
  deliveryCondition: ShipmentCondition | null;
  deliveryNotes: string | null;
  cancelReason: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
