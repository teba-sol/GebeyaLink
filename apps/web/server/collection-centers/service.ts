import 'server-only';

import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type {
  CollectionCenterDto,
  PaginatedCollectionCenters,
} from '@gebeyalink/types';
import type {
  CreateCollectionCenterInput,
  ListCollectionCentersQuery,
  UpdateCollectionCenterInput,
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
import { collectionCenters } from '../db/schema/collection-centers';

/**
 * Collection centers (docs/prd.md §9; docs/roles-and-permissions.md §5–6, §9).
 * Admin-only create/update/deactivate; staff and collection agents view
 * centers within their cooperative boundary.
 */

const CENTER_ALLOWED_ROLES = ['admin', 'cooperative_staff', 'collection_agent'] as const;

type CenterRow = typeof collectionCenters.$inferSelect;

function toDto(row: CenterRow): CollectionCenterDto {
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    name: row.name,
    location: row.location,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const notDeleted = isNull(collectionCenters.deletedAt);

async function requireExisting(id: string): Promise<CenterRow> {
  const row = await db.query.collectionCenters.findFirst({
    where: and(eq(collectionCenters.id, id), notDeleted),
  });
  if (!row) {
    throw new AuthzError('not_found', 'collection center not found');
  }
  return row;
}

async function handleUniqueConflict(error: unknown): Promise<never> {
  const cause = (error as { cause?: unknown }).cause ?? error;
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
    throw new ConflictError('a collection center with this name already exists in this cooperative');
  }
  throw error;
}

export async function createCollectionCenter(
  actor: Actor,
  input: CreateCollectionCenterInput,
): Promise<CollectionCenterDto> {
  requireRole(actor, 'admin');
  await requireCooperativeScope(actor, input.cooperativeId);

  try {
    const [row] = await db
      .insert(collectionCenters)
      .values({
        cooperativeId: input.cooperativeId,
        name: input.name,
        location: input.location ?? null,
      })
      .returning();
    return toDto(row);
  } catch (error) {
    return await handleUniqueConflict(error);
  }
}

export async function listCollectionCenters(
  actor: Actor,
  query: ListCollectionCentersQuery,
): Promise<PaginatedCollectionCenters> {
  requireRole(actor, ...CENTER_ALLOWED_ROLES);

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
      ? and(notDeleted, eq(collectionCenters.cooperativeId, query.cooperativeId))
      : and(notDeleted, inArray(collectionCenters.cooperativeId, ids));
  } else if (query.cooperativeId) {
    scopeWhere = and(notDeleted, eq(collectionCenters.cooperativeId, query.cooperativeId));
  }

  const [totalRow] = await db
    .select({ value: count() })
    .from(collectionCenters)
    .where(scopeWhere);
  const rows = await db
    .select()
    .from(collectionCenters)
    .where(scopeWhere)
    .orderBy(desc(collectionCenters.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total: totalRow.value,
  };
}

export async function getCollectionCenter(actor: Actor, id: string): Promise<CollectionCenterDto> {
  requireRole(actor, ...CENTER_ALLOWED_ROLES);
  const row = await requireExisting(id);
  await requireCooperativeScope(actor, row.cooperativeId);
  return toDto(row);
}

export async function updateCollectionCenter(
  actor: Actor,
  id: string,
  patch: UpdateCollectionCenterInput,
): Promise<CollectionCenterDto> {
  requireRole(actor, 'admin');
  await requireExisting(id);

  try {
    const [row] = await db
      .update(collectionCenters)
      .set({
        name: patch.name,
        location: patch.location,
        active: patch.active,
        updatedAt: new Date(),
      })
      .where(and(eq(collectionCenters.id, id), notDeleted))
      .returning();
    if (!row) {
      throw new AuthzError('not_found', 'collection center not found');
    }
    return toDto(row);
  } catch (error) {
    return await handleUniqueConflict(error);
  }
}