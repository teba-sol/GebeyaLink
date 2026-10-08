/** Farmer delivery + inventory enums — C3 (docs/prd.md §11.1, §12.2). */

export const DELIVERY_QUALITY_GRADES = ['A', 'B', 'C', 'REJECTED'] as const;
export type DeliveryQualityGrade = (typeof DELIVERY_QUALITY_GRADES)[number];

export const DELIVERY_STATUSES = [
  'RECEIVED',
  'WEIGHED',
  'QUALITY_CHECKED',
  'ACCEPTED',
  'REJECTED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const INVENTORY_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'COMMITTED',
  'DISPATCHED',
  'SOLD',
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];