/**
 * Shared technical types.
 *
 * Business-domain types are added per approved core: cooperatives (C1),
 * farmers (C2), deliveries + inventory (C3), marketplace listings + orders
 * (C4), order response + payment records (C5), shipments (C6). Later cores
 * (disputes, ...) are added only when implemented from the approved
 * documents in `docs/`.
 */

/** The five approved MVP platform roles (docs/roles-and-permissions.md §2). */
export const PLATFORM_ROLES = [
  'admin',
  'cooperative_staff',
  'collection_agent',
  'buyer',
  'transporter',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** API response envelopes (docs/tech-stack.md §6). */
export type ApiSuccess<T> = { data: T };

export type ApiFailure = { error: { code: string; message: string } };

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type {
  CooperativeDto,
  CooperativeListQuery,
  CooperativeStatus,
  PaginatedCooperatives,
} from './cooperatives';
export type { FarmerDto, FarmerListQuery, PaginatedFarmers } from './farmers';
export {
  DELIVERY_QUALITY_GRADES,
  DELIVERY_STATUSES,
  INVENTORY_STATUSES,
} from './deliveries';
export type {
  DeliveryQualityGrade,
  DeliveryStatus,
  InventoryStatus,
} from './deliveries';
export type {
  CollectionCenterDto,
  CollectionCenterListQuery,
  DeliveryDto,
  DeliveryListQuery,
  InventoryListQuery,
  InventoryLotDetailDto,
  InventoryLotDto,
  PaginatedCollectionCenters,
  PaginatedDeliveries,
  PaginatedInventoryLots,
  ProductDto,
} from './collection';
export {
  AI_SOURCING_WARNING_CODES,
  LISTING_STATUSES,
  ORDER_STATUSES,
  REJECTION_REASONS,
  RESERVATION_RELEASE_REASONS,
  RESERVATION_STATUSES,
} from './marketplace';
export type {
  AiSourcingCriteria,
  AiSourcingResult,
  AiSourcingWarning,
  AiSourcingWarningCode,
  ListingStatus,
  MarketplaceListQuery,
  MarketplaceListingDto,
  OrderDto,
  OrderListQuery,
  OrderStatus,
  PaginatedMarketplaceListings,
  PaginatedOrders,
  RejectionReason,
  ReservationDto,
  ReservationReleaseReason,
  ReservationStatus,
} from './marketplace';
export { PAYMENT_STATUSES } from './payments';
export type { PaymentDto, PaymentStatus } from './payments';
export { AUDIT_EVENT_TYPES } from './audit';
export type { AuditEntity, AuditEventType } from './audit';
export { VERIFICATION_ORG_TYPES, VERIFICATION_STATUSES } from './verification';
export type {
  VerificationOrgType,
  VerificationRequestDto,
  VerificationStatus,
} from './verification';
export type { BuyerDto } from './buyers';
export type { TransporterDto } from './transporters';
export {
  SHIPMENT_CONDITIONS,
  SHIPMENT_STATUSES,
  SHIPMENT_TRANSPORTER_KINDS,
} from './shipments';
export type {
  ShipmentCondition,
  ShipmentDto,
  ShipmentStatus,
  ShipmentTransporterKind,
} from './shipments';
