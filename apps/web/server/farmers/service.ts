import 'server-only';

import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { FarmerDto, PaginatedFarmers } from '@gebeyalink/types';
import type {
  CreateFarmerInput,
  ListFarmersQuery,
  UpdateFarmerInput,
} from '@gebeyalink/validation';

import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { db } from '../db';
import { farmers } from '../db/schema/farmers';

/**
 * Farmer business records (docs/prd.md §8.1, docs/roles-and-permissions.md §3, §9, §11).
 * Farmers are records only — never platform users. Cooperative staff and
 * collection agents operate within their active membership boundary; admins
 * have platform-wide (✓*) access.
 */

type FarmerRow = typeof farmers.$inferSelect;

function toDto(row: FarmerRow): FarmerDto {
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    name: row.name,
    phone: row.phone,
    location: row.location,
    active: row.active,
    registeredAt: row.registeredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const notDeleted = isNull(farmers.deletedAt);

async function requireExisting(id: string): Promise<FarmerRow> {
  const row = await db.query.farmers.findFirst({
    where: and(eq(farmers.id, id), notDeleted),
  });
  if (!row) {
    throw new AuthzError('not_found', 'farmer not found');
  }
  return row;
}

/** Enforce §12 ownership: non-admins need an active membership in the farmer's cooperative. */
async function requireFarmerScope(actor: Actor, cooperativeId: string): Promise<void> {
  if (actor.role === 'admin') return;
  const memberships = await getActiveMemberships(actor.userId);
  if (!memberships.some((m) => m.cooperativeId === cooperativeId)) {
    throw new AuthzError('forbidden', 'not a member of this cooperative');
  }
}

async function handleUniqueConflict(error: unknown): Promise<never> {
  const cause = (error as { cause?: unknown }).cause ?? error;
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
    throw new ConflictError('a farmer with this phone is already registered in this cooperative');
  }
  throw error;
}

export async function createFarmer(actor: Actor, input: CreateFarmerInput): Promise<FarmerDto> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
  await requireCooperativeScope(actor, input.cooperativeId);

  try {
    const [row] = await db
      .insert(farmers)
      .values({
        cooperativeId: input.cooperativeId,
        name: input.name,
        phone: input.phone ?? null,
        location: input.location ?? null,
        registeredAt: input.registeredAt ? new Date(input.registeredAt) : new Date(),
      })
      .returning();
    return toDto(row);
  } catch (error) {
    return await handleUniqueConflict(error);
  }
}

export async function listFarmers(
  actor: Actor,
  query: ListFarmersQuery,
): Promise<PaginatedFarmers> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');

  const { page, limit } = query;
  const searchWhere: SQL | undefined = query.search
    ? or(ilike(farmers.name, `%${query.search}%`), ilike(farmers.phone, `%${query.search}%`))
    : undefined;

  let scopeWhere: SQL | undefined = notDeleted;
  if (actor.role !== 'admin') {
    const memberships = await getActiveMemberships(actor.userId);
    const ids = memberships.map((m) => m.cooperativeId);
    if (ids.length === 0) {
      return { items: [], page, limit, total: 0 };
    }
    scopeWhere = query.cooperativeId
      ? and(notDeleted, eq(farmers.cooperativeId, query.cooperativeId))
      : and(notDeleted, inArray(farmers.cooperativeId, ids));
  } else if (query.cooperativeId) {
    scopeWhere = and(notDeleted, eq(farmers.cooperativeId, query.cooperativeId));
  }

  const where = and(scopeWhere, searchWhere);

  const [totalRow] = await db.select({ value: count() }).from(farmers).where(where);
  const rows = await db
    .select()
    .from(farmers)
    .where(where)
    .orderBy(desc(farmers.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total: totalRow.value,
  };
}

export async function getFarmer(actor: Actor, id: string): Promise<FarmerDto> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
  const row = await requireExisting(id);
  await requireFarmerScope(actor, row.cooperativeId);
  return toDto(row);
}

export async function updateFarmer(
  actor: Actor,
  id: string,
  patch: UpdateFarmerInput,
): Promise<FarmerDto> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
  const row = await requireExisting(id);
  await requireFarmerScope(actor, row.cooperativeId);

  try {
    const [updated] = await db
      .update(farmers)
      .set({
        name: patch.name,
        phone: patch.phone,
        location: patch.location,
        active: patch.active,
        updatedAt: new Date(),
      })
      .where(and(eq(farmers.id, id), notDeleted))
      .returning();
    if (!updated) {
      throw new AuthzError('not_found', 'farmer not found');
    }
    return toDto(updated);
  } catch (error) {
    return await handleUniqueConflict(error);
  }
}
