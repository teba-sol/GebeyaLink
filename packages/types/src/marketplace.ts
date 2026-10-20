/** Marketplace listing + order types — C4 (docs/prd.md §15–§18), C5 (§19–§22). */

import type { DeliveryQualityGrade } from './deliveries';
import type { PaymentStatus } from './payments';

export const LISTING_STATUSES = ['active', 'paused', 'closed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PAYMENT_CONFIRMED',
  'COMPLETED',
  'DISPUTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RESERVATION_STATUSES = ['ACTIVE', 'RELEASED', 'CONVERTED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_RELEASE_REASONS = ['expired', 'cancelled', 'rejected'] as const;
export type ReservationReleaseReason = (typeof RESERVATION_RELEASE_REASONS)[number];

/** Rejection reasons (docs/prd.md §19.2); "other" requires an explanation. */
export const REJECTION_REASONS = [
  'insufficient_stock',
  'quality_issue',
  'already_committed',
  'operational_issue',
  'incorrect_order',
  'other',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/**
 * Buyer-visible marketplace listing. Quantity facts are derived live from
 * the underlying C3 inventory lot — the listing never stores its own stock
 * counter (no second inventory system).
 */
export type MarketplaceListingDto = {
  id: string;
  cooperativeId: string;
  cooperativeName: string;
  inventoryLotId: string;
  productId: string;
  qualityGrade: DeliveryQualityGrade;
  collectionCenterId: string;
  location: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  pricePerUnit: number;
  minOrderQuantity: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceListQuery = {
  productId: string | null;
  qualityGrade: DeliveryQualityGrade | null;
  cooperativeId: string | null;
  minAvailable: number | null;
  maxPrice: number | null;
  location: string | null;
  status: ListingStatus | null;
  page: number;
  limit: number;
};

export type PaginatedMarketplaceListings = {
  items: MarketplaceListingDto[];
  page: number;
  limit: number;
  total: number;
};

/**
 * AI-assisted sourcing search: the structured search criteria the AI extracts
 * from a buyer's natural-language request. Criteria are read-only search
 * filters — they never reserve inventory or create an order (the buyer still
 * places an order to hold stock).
 */
export type AiSourcingCriteria = {
  productId?: string;
  qualityGrade?: DeliveryQualityGrade;
  location?: string;
  maxPrice?: number;
  /** Minimum available inventory (kg) the buyer needs — a search-only filter. */
  minAvailable?: number;
};

export const AI_SOURCING_WARNING_CODES = [
  'unsupported_commodity',
  'invalid_grade',
] as const;
export type AiSourcingWarningCode = (typeof AI_SOURCING_WARNING_CODES)[number];

export type AiSourcingWarning = {
  code: AiSourcingWarningCode;
  message: string;
};

export type AiSourcingResult = {
  query: string;
  criteria: AiSourcingCriteria;
  /** Platform minimum order quantity in kg (never hardcoded client-side). */
  minOrderQuantityKg: number;
  warnings: AiSourcingWarning[];
};

export type OrderDto = {
  id: string;
  buyerId: string;
  cooperativeId: string;
  listingId: string;
  inventoryLotId: string;
  productId: string;
  qualityGrade: DeliveryQualityGrade;
  quantity: number;
  unitPrice: number;
  productTotal: number;
  status: OrderStatus;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: RejectionReason | null;
  rejectionExplanation: string | null;
  paymentStatus: PaymentStatus | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderListQuery = {
  status: OrderStatus | null;
  page: number;
  limit: number;
};

export type PaginatedOrders = {
  items: OrderDto[];
  page: number;
  limit: number;
  total: number;
};

export type ReservationDto = {
  id: string;
  orderId: string;
  lotId: string;
  buyerId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  releasedAt: string | null;
  releaseReason: ReservationReleaseReason | null;
  createdAt: string;
  updatedAt: string;
};
