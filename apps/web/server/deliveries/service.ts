import 'server-only';

import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type { DeliveryDto, PaginatedDeliveries } from '@gebeyalink/types';
import type { CreateDeliveryInput, ListDeliveriesQuery } from '@gebeyalink/validation';

import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { db } from '../db';
import { collectionCenters } from '../db/schema/collection-centers';
import { farmers } from '../db/schema/farmers';
import { farmerDeliveries } from '../db/schema/farmer-deliveries';
import { inventoryLotSources, inventoryLots } from '../db/schema/inventory';
import { products } from '../db/schema/products';

/**
 * Farmer deliveries (docs/prd.md §8.2–8.3; docs/roles-and-permissions.md §6, §9).
 *
 * Single-form transactional recording: the agent submits one validated
 * snapshot; the delivery is saved and, when accepted, the corresponding
 * aggregated inventory lot is created/extended in the same transaction.
 * A rejected delivery never creates inventory (PRD §8.3).
 */

const DELIVERY_ALLOWED_ROLES = ['admin', 'cooperative_staff', 'collection_agent'] as const;

type DeliveryRow = typeof farmerDeliveries.$inferSelect;

function toDto(row: DeliveryRow): DeliveryDto {
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    collectionCenterId: row.collectionCenterId,
    farmerId: row.farmerId,
    productId: row.productId,
    recordedById: row.recordedById,
    claimedQuantity: row.claimedQuantity,
    measuredQuantity: row.measuredQuantity,
    acceptedQuantity: row.acceptedQuantity,
    rejectedQuantity: row.rejectedQuantity,
    qualityGrade: row.qualityGrade,
    status: row.status,
    deliveryDate: row.deliveryDate.toISOString(),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireExisting(id: string): Promise<DeliveryRow> {
  const row = await db.query.farmerDeliveries.findFirst({
    where: eq(farmerDeliveries.id, id),
  });
  if (!row) {
    throw new AuthzError('not_found', 'delivery not found');
  }
  return row;
}

async function handleUniqueConflict(error: unknown): Promise<never> {
  const cause = (error as { cause?: unknown }).cause ?? error;
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
    throw new ConflictError('an inventory lot already exists for this combination');
  }
  throw error;
}

export async function createDelivery(actor: Actor, input: CreateDeliveryInput): Promise<DeliveryDto> {
  requireRole(actor, ...DELIVERY_ALLOWED_ROLES);
  await requireCooperativeScope(actor, input.cooperativeId);

  const farmer = await db.query.farmers.findFirst({
    where: and(eq(farmers.id, input.farmerId), isNull(farmers.deletedAt)),
  });
  if (!farmer) {
    throw new AuthzError('not_found', 'farmer not found');
  }
  if (farmer.cooperativeId !== input.cooperativeId) {
    throw new AuthzError('forbidden', 'farmer does not belong to this cooperative');
  }
  if (!farmer.active) {
    throw new AuthzError('forbidden', 'farmer is inactive');
  }

  const center = await db.query.collectionCenters.findFirst({
    where: and(eq(collectionCenters.id, input.collectionCenterId), isNull(collectionCenters.deletedAt)),
  });
  if (!center) {
    throw new AuthzError('not_found', 'collection center not found');
  }
  if (center.cooperativeId !== input.cooperativeId) {
    throw new AuthzError('forbidden', 'collection center does not belong to this cooperative');
  }
  if (!center.active) {
    throw new AuthzError('forbidden', 'collection center is inactive');
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), eq(products.active, true)),
  });
  if (!product) {
    throw new AuthzError('not_found', 'product not found');
  }

  const accepted = input.acceptedQuantity;
  const status = input.qualityGrade === 'REJECTED' ? 'REJECTED' : 'ACCEPTED';

  let row: DeliveryRow;
  try {
    row = await db.transaction(async (tx) => {
      const [delivery] = await tx
        .insert(farmerDeliveries)
        .values({
          cooperativeId: input.cooperativeId,
          collectionCenterId: input.collectionCenterId,
          farmerId: input.farmerId,
          productId: input.productId,
          recordedById: actor.userId,
          claimedQuantity: input.claimedQuantity,
          measuredQuantity: input.measuredQuantity,
          acceptedQuantity: accepted,
          rejectedQuantity: input.rejectedQuantity,
          qualityGrade: input.qualityGrade,
          status,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
          notes: input.notes ?? null,
        })
        .returning();

      if (status === 'ACCEPTED' && accepted > 0) {
        const existing = await tx.query.inventoryLots.findFirst({
          where: and(
            eq(inventoryLots.cooperativeId, input.cooperativeId),
            eq(inventoryLots.productId, input.productId),
            eq(inventoryLots.qualityGrade, input.qualityGrade),
            eq(inventoryLots.collectionCenterId, input.collectionCenterId),
            isNull(inventoryLots.deletedAt),
          ),
        });

        let lotId: string;
        if (existing) {
          const [updated] = await tx
            .update(inventoryLots)
            .set({
              totalQuantity: existing.totalQuantity + accepted,
              availableQuantity: existing.availableQuantity + accepted,
              updatedAt: new Date(),
            })
            .where(eq(inventoryLots.id, existing.id))
            .returning({ id: inventoryLots.id });
          lotId = updated.id;
        } else {
          const [created] = await tx
            .insert(inventoryLots)
            .values({
              cooperativeId: input.cooperativeId,
              collectionCenterId: input.collectionCenterId,
              productId: input.productId,
              qualityGrade: input.qualityGrade,
              totalQuantity: accepted,
              availableQuantity: accepted,
            })
            .returning();
          lotId = created.id;
        }

        await tx.insert(inventoryLotSources).values({
          lotId,
          deliveryId: delivery.id,
          acceptedQuantity: accepted,
        });
      }

      return delivery;
    });
  } catch (error) {
    return await handleUniqueConflict(error);
  }

  return toDto(row);
}

export async function listDeliveries(
  actor: Actor,
  query: ListDeliveriesQuery,
): Promise<PaginatedDeliveries> {
  requireRole(actor, ...DELIVERY_ALLOWED_ROLES);

  const { page, limit } = query;
  const filters: SQL[] = [];
  if (query.farmerId) filters.push(eq(farmerDeliveries.farmerId, query.farmerId));
  if (query.productId) filters.push(eq(farmerDeliveries.productId, query.productId));
  if (query.status) filters.push(eq(farmerDeliveries.status, query.status));

  let scopeWhere: SQL | undefined;
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
      ? eq(farmerDeliveries.cooperativeId, query.cooperativeId)
      : inArray(farmerDeliveries.cooperativeId, ids);
  } else if (query.cooperativeId) {
    scopeWhere = eq(farmerDeliveries.cooperativeId, query.cooperativeId);
  }

  const where = scopeWhere ? and(scopeWhere, ...filters) : filters.length ? and(...filters) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(farmerDeliveries).where(where);
  const rows = await db
    .select()
    .from(farmerDeliveries)
    .where(where)
    .orderBy(desc(farmerDeliveries.deliveryDate))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total: totalRow.value,
  };
}

export async function getDelivery(actor: Actor, id: string): Promise<DeliveryDto> {
  requireRole(actor, ...DELIVERY_ALLOWED_ROLES);
  const row = await requireExisting(id);
  if (actor.role !== 'admin') {
    const memberships = await getActiveMemberships(actor.userId);
    if (!memberships.some((m) => m.cooperativeId === row.cooperativeId)) {
      throw new AuthzError('forbidden', 'not a member of this cooperative');
    }
  }
  return toDto(row);
}