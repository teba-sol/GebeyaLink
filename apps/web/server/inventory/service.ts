import 'server-only';

import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type {
  InventoryLotDetailDto,
  InventoryLotDto,
  PaginatedInventoryLots,
} from '@gebeyalink/types';
import type { ListInventoryQuery } from '@gebeyalink/validation';

import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireRole,
} from '../authz/guards';
import { db } from '../db';
import { inventoryLotSources, inventoryLots } from '../db/schema/inventory';

/**
 * Inventory lots (docs/prd.md §12; docs/business-domain-model.md §15–17).
 * Read-only in C3: lots are created/extended by accepted farmer deliveries.
 * Staff and collection agents see only their cooperative's lots.
 */

const INVENTORY_ALLOWED_ROLES = ['admin', 'cooperative_staff', 'collection_agent'] as const;

type LotRow = typeof inventoryLots.$inferSelect;

function toDto(row: LotRow): InventoryLotDto {
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    collectionCenterId: row.collectionCenterId,
    productId: row.productId,
    qualityGrade: row.qualityGrade,
    totalQuantity: row.totalQuantity,
    availableQuantity: row.availableQuantity,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

const notDeleted = isNull(inventoryLots.deletedAt);

export async function listInventory(
  actor: Actor,
  query: ListInventoryQuery,
): Promise<PaginatedInventoryLots> {
  requireRole(actor, ...INVENTORY_ALLOWED_ROLES);

  const { page, limit } = query;
  let scopeWhere: SQL | undefined = notDeleted;
  if (actor.role !== 'admin') {
    const memberships = await getActiveMemberships(actor.userId);
    const ids = memberships.map((m) => m.cooperativeId);
    if (ids.length === 0) {
      return { items: [], page, limit, total: 0 };
    }
    if (query.cooperativeId && !ids.includes(query.cooperativeId)) {
      return { items: [], page, limit, total: 0 };
    }
    scopeWhere = query.cooperativeId
      ? and(notDeleted, eq(inventoryLots.cooperativeId, query.cooperativeId))
      : and(notDeleted, inArray(inventoryLots.cooperativeId, ids));
  } else if (query.cooperativeId) {
    scopeWhere = and(notDeleted, eq(inventoryLots.cooperativeId, query.cooperativeId));
  }

  const [totalRow] = await db.select({ value: count() }).from(inventoryLots).where(scopeWhere);
  const rows = await db
    .select()
    .from(inventoryLots)
    .where(scopeWhere)
    .orderBy(desc(inventoryLots.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total: totalRow.value,
  };
}

export async function getInventoryLot(actor: Actor, id: string): Promise<InventoryLotDetailDto> {
  requireRole(actor, ...INVENTORY_ALLOWED_ROLES);

  const row = await db.query.inventoryLots.findFirst({
    where: and(eq(inventoryLots.id, id), notDeleted),
  });
  if (!row) {
    throw new AuthzError('not_found', 'inventory lot not found');
  }
  if (actor.role !== 'admin') {
    const memberships = await getActiveMemberships(actor.userId);
    if (!memberships.some((m) => m.cooperativeId === row.cooperativeId)) {
      throw new AuthzError('forbidden', 'not a member of this cooperative');
    }
  }

  const sources = await db
    .select()
    .from(inventoryLotSources)
    .where(eq(inventoryLotSources.lotId, row.id));

  return {
    ...toDto(row),
    sources: sources.map((source) => ({
      deliveryId: source.deliveryId,
      acceptedQuantity: source.acceptedQuantity,
    })),
  };
}