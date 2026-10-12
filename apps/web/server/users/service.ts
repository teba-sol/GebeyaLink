import 'server-only';

import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { PlatformRole } from '@gebeyalink/types';
import type {
  AddMembershipInput,
  ListUsersQuery,
  UpdateMembershipInput,
  UpdateUserRoleInput,
} from '@gebeyalink/validation';

import { AuthzError, type Actor, requireRole } from '../authz/guards';
import { db } from '../db';
import { user } from '../db/schema/auth';
import { cooperativeMembers, cooperatives } from '../db/schema/cooperatives';
import { userRoles } from '../db/schema/user-roles';
import { BusinessRuleError } from '../http/errors';
import type { AdminMembership, AdminUser, PaginatedUsers } from '../../features/admin/types';

/**
 * Platform user & membership administration (docs/prd.md §6.6;
 * docs/roles-and-permissions.md §2, §5). Accounts are created by public
 * sign-up; admins assign the single platform role (user_roles) and the
 * cooperative memberships (cooperative_members) here.
 */

export type { AdminMembership, AdminUser, PaginatedUsers };

async function loadMemberships(userIds: string[]): Promise<Map<string, AdminMembership[]>> {
  const byUser = new Map<string, AdminMembership[]>();
  if (userIds.length === 0) return byUser;
  const rows = await db
    .select({
      id: cooperativeMembers.id,
      userId: cooperativeMembers.userId,
      cooperativeId: cooperativeMembers.cooperativeId,
      cooperativeName: cooperatives.name,
      active: cooperativeMembers.active,
    })
    .from(cooperativeMembers)
    .leftJoin(cooperatives, eq(cooperativeMembers.cooperativeId, cooperatives.id))
    .where(inArray(cooperativeMembers.userId, userIds))
    .orderBy(desc(cooperativeMembers.active), cooperatives.name);
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      cooperativeId: row.cooperativeId,
      cooperativeName: row.cooperativeName,
      active: row.active,
    });
    byUser.set(row.userId, list);
  }
  return byUser;
}

function toAdminUser(
  target: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
  },
  role: PlatformRole | null,
  memberships: AdminMembership[],
): AdminUser {
  return {
    id: target.id,
    name: target.name,
    email: target.email,
    emailVerified: target.emailVerified,
    role,
    createdAt: target.createdAt.toISOString(),
    memberships,
  };
}

export async function listUsers(actor: Actor, query: ListUsersQuery): Promise<PaginatedUsers> {
  requireRole(actor, 'admin');

  const searchWhere: SQL | undefined = query.q
    ? or(ilike(user.name, `%${query.q}%`), ilike(user.email, `%${query.q}%`))
    : undefined;
  const roleWhere: SQL | undefined =
    query.role === 'none'
      ? isNull(userRoles.role)
      : query.role
        ? eq(userRoles.role, query.role)
        : undefined;
  const where = and(searchWhere, roleWhere);

  const [totalRow] = await db
    .select({ value: count() })
    .from(user)
    .leftJoin(userRoles, eq(user.id, userRoles.userId))
    .where(where);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      role: userRoles.role,
    })
    .from(user)
    .leftJoin(userRoles, eq(user.id, userRoles.userId))
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const memberships = await loadMemberships(rows.map((row) => row.id));

  return {
    items: rows.map((row) =>
      toAdminUser(
        {
          id: row.id,
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified,
          createdAt: row.createdAt,
        },
        (row.role as PlatformRole | null) ?? null,
        memberships.get(row.id) ?? [],
      ),
    ),
    page: query.page,
    limit: query.limit,
    total: totalRow.value,
  };
}

export async function updateUserRole(
  actor: Actor,
  userId: string,
  input: UpdateUserRoleInput,
): Promise<AdminUser> {
  requireRole(actor, 'admin');
  const target = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) throw new AuthzError('not_found', 'user not found');

  if (input.role !== 'admin') {
    const [current] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    if (current?.role === 'admin') {
      const [admins] = await db
        .select({ value: count() })
        .from(userRoles)
        .where(eq(userRoles.role, 'admin'));
      if (admins.value <= 1) {
        throw new BusinessRuleError('last_admin', 'cannot remove the last platform admin');
      }
    }
  }

  if (input.role === null) {
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
  } else {
    await db
      .insert(userRoles)
      .values({ userId, role: input.role })
      .onConflictDoUpdate({ target: userRoles.userId, set: { role: input.role } });
  }

  return toAdminUser(
    target,
    (input.role as PlatformRole | null) ?? null,
    (await loadMemberships([userId])).get(userId) ?? [],
  );
}

export async function addMembership(
  actor: Actor,
  userId: string,
  input: AddMembershipInput,
): Promise<AdminMembership> {
  requireRole(actor, 'admin');
  const target = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) throw new AuthzError('not_found', 'user not found');
  const coop = await db.query.cooperatives.findFirst({
    where: and(eq(cooperatives.id, input.cooperativeId), isNull(cooperatives.deletedAt)),
  });
  if (!coop) throw new AuthzError('not_found', 'cooperative not found');

  const [row] = await db
    .insert(cooperativeMembers)
    .values({ userId, cooperativeId: input.cooperativeId, active: input.active })
    .onConflictDoUpdate({
      target: [cooperativeMembers.cooperativeId, cooperativeMembers.userId],
      set: { active: input.active, updatedAt: new Date() },
    })
    .returning();

  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    cooperativeName: coop.name,
    active: row.active,
  };
}

export async function updateMembership(
  actor: Actor,
  membershipId: string,
  input: UpdateMembershipInput,
): Promise<AdminMembership> {
  requireRole(actor, 'admin');
  const [row] = await db
    .update(cooperativeMembers)
    .set({ active: input.active, updatedAt: new Date() })
    .where(eq(cooperativeMembers.id, membershipId))
    .returning();
  if (!row) throw new AuthzError('not_found', 'membership not found');
  const [coop] = await db
    .select({ name: cooperatives.name })
    .from(cooperatives)
    .where(eq(cooperatives.id, row.cooperativeId));
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
    cooperativeName: coop?.name ?? null,
    active: row.active,
  };
}

export async function removeMembership(actor: Actor, membershipId: string): Promise<void> {
  requireRole(actor, 'admin');
  const [row] = await db
    .delete(cooperativeMembers)
    .where(eq(cooperativeMembers.id, membershipId))
    .returning({ id: cooperativeMembers.id });
  if (!row) throw new AuthzError('not_found', 'membership not found');
}