/**
 * Shared technical types.
 *
 * Business-domain types (farmer deliveries, inventory, orders, payments,
 * shipments, disputes, ...) are intentionally absent. They will be added
 * only when those features are implemented from the approved documents in
 * `docs/`.
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
