import 'server-only';

import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type { CooperativeDto, PaginatedCooperatives } from '@gebeyalink/types';
import type { CreateCooperativeInput, UpdateCooperativeInput } from '@gebeyalink/validation';

import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { db } from '../db';
import { cooperatives } from '../db/schema/cooperatives';
import { uniqueSlug } from './slug';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

type CooperativeRow = typeof cooperatives.$inferSelect;

/** Fields cooperative staff may manage on their own cooperative. */
const STAFF_UPDATEABLE = [
  'name',
  'phone',
  'email',
  'region',
  'zone',
  'district',
  'address',
] as const;

function toDto(row: CooperativeRow): CooperativeDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    phone: row.phone,
    email: row.email,
    region: row.region,
    zone: row.zone,
    district: row.district,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const notDeleted = isNull(cooperatives.deletedAt);

async function requireExisting(id: string): Promise<CooperativeRow> {
  const row = await db.query.cooperatives.findFirst({
    where: and(eq(cooperatives.id, id), notDeleted),
  });
  if (!row) {
    throw new AuthzError('not_found', 'cooperative not found');
  }
  return row;
}

export async function createCooperative(
  actor: Actor,
  input: CreateCooperativeInput,
): Promise<CooperativeDto> {
  requireRole(actor, 'admin');

  const slug = input.slug ?? (await uniqueSlug(input.name));
  try {
    const [row] = await db
      .insert(cooperatives)
      .values({
        name: input.name,
        slug,
        status: input.status ?? 'active',
        phone: input.phone ?? null,
        email: input.email ?? null,
        region: input.region ?? null,
        zone: input.zone ?? null,
        district: input.district ?? null,
        address: input.address ?? null,
      })
      .returning();
    return toDto(row);
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause ?? error;
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
      throw new ConflictError('a cooperative with this slug already exists');
    }
    throw error;
  }
}

export async function listCooperatives(
  actor: Actor,
  page: number,
  limit: number,
): Promise<PaginatedCooperatives> {
  requireRole(actor, 'admin', 'cooperative_staff');

  let scopeWhere: SQL | undefined = notDeleted;
  if (actor.role === 'cooperative_staff') {
    const memberships = await getActiveMemberships(actor.userId);
    const ids = memberships.map((m) => m.cooperativeId);
    if (ids.length === 0) {
      return { items: [], page, limit, total: 0 };
    }
    scopeWhere = and(notDeleted, inArray(cooperatives.id, ids));
  }

  const [totalRow] = await db.select({ value: count() }).from(cooperatives).where(scopeWhere);
  const rows = await db
    .select()
    .from(cooperatives)
    .where(scopeWhere)
    .orderBy(desc(cooperatives.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total: totalRow.value,
  };
}

export async function getCooperative(actor: Actor, id: string): Promise<CooperativeDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  await requireCooperativeScope(actor, id);
  return toDto(await requireExisting(id));
}

export async function updateCooperative(
  actor: Actor,
  id: string,
  patch: UpdateCooperativeInput,
): Promise<CooperativeDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  await requireCooperativeScope(actor, id);

  if (actor.role === 'cooperative_staff') {
    if (patch.status !== undefined) {
      throw new AuthzError('forbidden', 'only admin may change cooperative status');
    }
    const denied = Object.keys(patch).filter(
      (key) => !(STAFF_UPDATEABLE as readonly string[]).includes(key),
    );
    if (denied.length > 0) {
      throw new AuthzError('forbidden', `field not allowed for staff: ${denied[0]}`);
    }
  }

  await requireExisting(id);

  const [row] = await db
    .update(cooperatives)
    .set({
      name: patch.name,
      status: patch.status,
      phone: patch.phone,
      email: patch.email,
      region: patch.region,
      zone: patch.zone,
      district: patch.district,
      address: patch.address,
      updatedAt: new Date(),
    })
    .where(and(eq(cooperatives.id, id), notDeleted))
    .returning();

  if (!row) {
    throw new AuthzError('not_found', 'cooperative not found');
  }
  return toDto(row);
}

export async function softDeleteCooperative(actor: Actor, id: string): Promise<void> {
  requireRole(actor, 'admin');
  await requireCooperativeScope(actor, id);

  const rows = await db
    .update(cooperatives)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(cooperatives.id, id), notDeleted))
    .returning({ id: cooperatives.id });

  if (rows.length === 0) {
    throw new AuthzError('not_found', 'cooperative not found');
  }
}
