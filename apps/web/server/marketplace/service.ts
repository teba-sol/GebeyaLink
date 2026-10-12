import 'server-only';

import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL } from 'drizzle-orm';
import type { MarketplaceListingDto, PaginatedMarketplaceListings } from '@gebeyalink/types';
import type { CreateListingInput, ListMarketplaceQuery, UpdateListingInput } from '@gebeyalink/validation';

import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { minOrderQuantityKg } from '../config/business';
import { db } from '../db';
import { collectionCenters } from '../db/schema/collection-centers';
import { cooperatives } from '../db/schema/cooperatives';
import { inventoryLots } from '../db/schema/inventory';
import { marketplaceListings } from '../db/schema/marketplace';
import { BusinessRuleError } from '../http/errors';
import { ConflictError } from '../cooperatives/service';
import { releaseExpiredReservations } from '../orders/service';

/**
 * Marketplace listings (docs/prd.md §16; docs/business-domain-model.md §18).
 *
 * A listing publishes exactly one C3 inventory lot and stores only the
 * cooperative's price. Quantities are always read live from the lot — there
 * is deliberately no listing-side stock counter, so listing quantity can
 * never exceed available inventory (C4 rule 9 holds by construction).
 *
 * Browse (read) is open to every role except transporter per the permission
 * matrix (docs/roles-and-permissions.md §12). Publishing requires admin or
 * cooperative staff membership in the listing's cooperative.
 */

const BROWSE_ROLES = ['admin', 'cooperative_staff', 'collection_agent', 'buyer'] as const;
const PUBLISH_ROLES = ['admin', 'cooperative_staff'] as const;

type ListingJoinRow = {
  listing: typeof marketplaceListings.$inferSelect;
  lot: typeof inventoryLots.$inferSelect;
  cooperative: typeof cooperatives.$inferSelect;
  center: typeof collectionCenters.$inferSelect;
};

function toDto(row: ListingJoinRow): MarketplaceListingDto {
  return {
    id: row.listing.id,
    cooperativeId: row.listing.cooperativeId,
    cooperativeName: row.cooperative.name,
    inventoryLotId: row.listing.inventoryLotId,
    productId: row.lot.productId,
    qualityGrade: row.lot.qualityGrade,
    collectionCenterId: row.lot.collectionCenterId,
    location: row.center.location,
    availableQuantity: row.lot.availableQuantity,
    reservedQuantity: row.lot.reservedQuantity,
    pricePerUnit: row.listing.pricePerUnit,
    minOrderQuantity: minOrderQuantityKg(),
    status: row.listing.status,
    createdAt: row.listing.createdAt.toISOString(),
    updatedAt: row.listing.updatedAt.toISOString(),
  };
}

const listingNotDeleted = isNull(marketplaceListings.deletedAt);
const lotNotDeleted = isNull(inventoryLots.deletedAt);
const cooperativeNotDeleted = isNull(cooperatives.deletedAt);
const centerNotDeleted = isNull(collectionCenters.deletedAt);

function joinedSelect() {
  return db.select({
    listing: marketplaceListings,
    lot: inventoryLots,
    cooperative: cooperatives,
    center: collectionCenters,
  });
}

function joinedFrom() {
  return joinedSelect()
    .from(marketplaceListings)
    .innerJoin(inventoryLots, eq(marketplaceListings.inventoryLotId, inventoryLots.id))
    .innerJoin(cooperatives, eq(marketplaceListings.cooperativeId, cooperatives.id))
    .innerJoin(collectionCenters, eq(inventoryLots.collectionCenterId, collectionCenters.id));
}

/**
 * Buyer visibility (docs/prd.md §16.4): active listing, active cooperative,
 * lot still carrying available quantity. Excludes listings whose inventory
 * has been fully reserved rather than mutating the cooperative's status.
 */
function buyerVisibilityConditions(): SQL[] {
  return [
    eq(marketplaceListings.status, 'active'),
    cooperativeNotDeleted,
    eq(cooperatives.status, 'active'),
    lotNotDeleted,
    centerNotDeleted,
    gte(inventoryLots.availableQuantity, 0.001),
  ];
}

function listingsOrderBy(sort: ListMarketplaceQuery['sort']) {
  switch (sort) {
    case 'price_asc':
      return [asc(marketplaceListings.pricePerUnit), asc(marketplaceListings.createdAt)];
    case 'price_desc':
      return [desc(marketplaceListings.pricePerUnit), desc(marketplaceListings.createdAt)];
    default:
      return [desc(marketplaceListings.createdAt)];
  }
}

export async function listListings(
  actor: Actor,
  query: ListMarketplaceQuery,
): Promise<PaginatedMarketplaceListings> {
  requireRole(actor, ...BROWSE_ROLES);
  await releaseExpiredReservations();

  const conds: SQL[] = [listingNotDeleted, lotNotDeleted, cooperativeNotDeleted, centerNotDeleted];

  if (actor.role === 'buyer') {
    conds.push(...buyerVisibilityConditions());
    if (query.cooperativeId) conds.push(eq(marketplaceListings.cooperativeId, query.cooperativeId));
  } else {
    conds.push(eq(marketplaceListings.status, query.status ?? 'active'));
    if (query.cooperativeId) conds.push(eq(marketplaceListings.cooperativeId, query.cooperativeId));
    else if (actor.role !== 'admin') {
      const memberships = await getActiveMemberships(actor.userId);
      const ids = memberships.map((m) => m.cooperativeId);
      if (ids.length === 0) return { items: [], page: query.page, limit: query.limit, total: 0 };
      conds.push(inArray(marketplaceListings.cooperativeId, ids));
    }
  }

  if (query.productId) conds.push(eq(inventoryLots.productId, query.productId));
  if (query.qualityGrade) conds.push(eq(inventoryLots.qualityGrade, query.qualityGrade));
  if (query.minAvailable != null) conds.push(gte(inventoryLots.availableQuantity, query.minAvailable));
  if (query.maxPrice != null) conds.push(lte(marketplaceListings.pricePerUnit, query.maxPrice));
  if (query.location) {
    const pattern = `%${query.location}%`;
    const locationCond = or(
      ilike(collectionCenters.location, pattern),
      ilike(cooperatives.region, pattern),
      ilike(cooperatives.district, pattern),
    );
    if (locationCond) conds.push(locationCond);
  }

  const where = and(...conds);

  const [totalRow] = await db.select({ value: count() }).from(marketplaceListings)
    .innerJoin(inventoryLots, eq(marketplaceListings.inventoryLotId, inventoryLots.id))
    .innerJoin(cooperatives, eq(marketplaceListings.cooperativeId, cooperatives.id))
    .innerJoin(collectionCenters, eq(inventoryLots.collectionCenterId, collectionCenters.id))
    .where(where);

  const rows = await joinedFrom()
    .where(where)
    .orderBy(...listingsOrderBy(query.sort))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    items: rows.map(toDto),
    page: query.page,
    limit: query.limit,
    total: totalRow.value,
  };
}

async function requireListingJoin(id: string): Promise<ListingJoinRow> {
  const row = await joinedFrom()
    .where(and(eq(marketplaceListings.id, id), listingNotDeleted))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) {
    throw new AuthzError('not_found', 'listing not found');
  }
  return row;
}

export async function getListing(actor: Actor, id: string): Promise<MarketplaceListingDto> {
  requireRole(actor, ...BROWSE_ROLES);
  await releaseExpiredReservations();
  const row = await requireListingJoin(id);
  if (actor.role === 'buyer') {
    const visible =
      row.listing.status === 'active' &&
      row.cooperative.status === 'active' &&
      !row.cooperative.deletedAt &&
      !row.lot.deletedAt &&
      row.lot.availableQuantity >= 0.001;
    if (!visible) {
      throw new AuthzError('not_found', 'listing not found');
    }
  }
  return toDto(row);
}

export async function createListing(
  actor: Actor,
  input: CreateListingInput,
): Promise<MarketplaceListingDto> {
  requireRole(actor, ...PUBLISH_ROLES);

  const lot = await db.query.inventoryLots.findFirst({
    where: and(eq(inventoryLots.id, input.inventoryLotId), lotNotDeleted),
  });
  if (!lot) {
    throw new AuthzError('not_found', 'inventory lot not found');
  }
  await requireCooperativeScope(actor, lot.cooperativeId);

  const cooperative = await db.query.cooperatives.findFirst({
    where: and(eq(cooperatives.id, lot.cooperativeId), cooperativeNotDeleted),
  });
  if (!cooperative || cooperative.status !== 'active') {
    throw new BusinessRuleError('cooperative_not_active', 'cooperative is not active');
  }
  if (cooperative.verificationStatus !== 'approved') {
    throw new BusinessRuleError(
      'cooperative_not_verified',
      'cooperative is not approved for selling',
    );
  }
  if (lot.availableQuantity < 0.001) {
    throw new BusinessRuleError(
      'insufficient_available_inventory',
      'lot has no available inventory to list',
    );
  }

  const existing = await db.query.marketplaceListings.findFirst({
    where: eq(marketplaceListings.inventoryLotId, lot.id),
  });

  try {
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictError('this inventory lot already has a listing');
      }
      const [revived] = await db
        .update(marketplaceListings)
        .set({
          cooperativeId: lot.cooperativeId,
          pricePerUnit: input.pricePerUnit,
          status: 'active',
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceListings.id, existing.id))
        .returning();
      return toDto(await requireListingJoin(revived.id));
    }

    const [created] = await db
      .insert(marketplaceListings)
      .values({
        cooperativeId: lot.cooperativeId,
        inventoryLotId: lot.id,
        pricePerUnit: input.pricePerUnit,
        status: 'active',
      })
      .returning();
    return toDto(await requireListingJoin(created.id));
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause ?? error;
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
      throw new ConflictError('this inventory lot already has a listing');
    }
    throw error;
  }
}

export async function updateListing(
  actor: Actor,
  id: string,
  patch: UpdateListingInput,
): Promise<MarketplaceListingDto> {
  requireRole(actor, ...PUBLISH_ROLES);

  const existing = await db.query.marketplaceListings.findFirst({
    where: and(eq(marketplaceListings.id, id), listingNotDeleted),
  });
  if (!existing) {
    throw new AuthzError('not_found', 'listing not found');
  }
  await requireCooperativeScope(actor, existing.cooperativeId);

  if (patch.status === 'active') {
    const cooperative = await db.query.cooperatives.findFirst({
      where: and(eq(cooperatives.id, existing.cooperativeId), cooperativeNotDeleted),
    });
    const lot = await db.query.inventoryLots.findFirst({
      where: and(eq(inventoryLots.id, existing.inventoryLotId), lotNotDeleted),
    });
    if (!cooperative || cooperative.status !== 'active') {
      throw new BusinessRuleError('cooperative_not_active', 'cooperative is not active');
    }
    if (cooperative.verificationStatus !== 'approved') {
      throw new BusinessRuleError(
        'cooperative_not_verified',
        'cooperative is not approved for selling',
      );
    }
    if (!lot || lot.availableQuantity < 0.001) {
      throw new BusinessRuleError(
        'insufficient_available_inventory',
        'lot has no available inventory to list',
      );
    }
  }

  await db
    .update(marketplaceListings)
    .set({
      pricePerUnit: patch.pricePerUnit,
      status: patch.status,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceListings.id, id));

  return toDto(await requireListingJoin(id));
}
