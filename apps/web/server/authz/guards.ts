import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { PlatformRole } from '@gebeyalink/types';

import { auth } from '../auth';
import { db } from '../db';
import { cooperativeMembers, cooperatives } from '../db/schema/cooperatives';
import { userRoles } from '../db/schema/user-roles';

/** Authorization failures carried through the service layer to the HTTP boundary. */
export type AuthzErrorCode = 'forbidden' | 'not_found';

export class AuthzError extends Error {
  readonly code: AuthzErrorCode;

  constructor(code: AuthzErrorCode, message: string) {
    super(message);
    this.name = 'AuthzError';
    this.code = code;
  }
}

export type Actor = {
  userId: string;
  role: PlatformRole | null;
};

/** Resolve the platform actor for a user id (user_roles). Null when unassigned. */
export async function getActor(userId: string): Promise<Actor | null> {
  const row = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, userId),
  });
  return row ? { userId: row.userId, role: row.role } : null;
}

export function requireRole(actor: Actor | null, ...roles: PlatformRole[]): Actor {
  if (!actor) {
    throw new AuthzError('forbidden', 'authentication required');
  }
  if (!actor.role) {
    throw new AuthzError('forbidden', 'account has no platform role');
  }
  if (!roles.includes(actor.role)) {
    throw new AuthzError('forbidden', `role ${actor.role} is not permitted`);
  }
  return actor;
}

/**
 * Cooperative ownership boundary (docs/roles-and-permissions.md §12).
 * Admins pass; cooperative staff and collection agents must have an active
 * membership in the cooperative (which must not be soft-deleted).
 */
export async function requireCooperativeScope(actor: Actor, cooperativeId: string): Promise<void> {
  if (actor.role === 'admin') {
    const exists = await db.query.cooperatives.findFirst({
      where: and(eq(cooperatives.id, cooperativeId), isNull(cooperatives.deletedAt)),
    });
    if (!exists) {
      throw new AuthzError('not_found', 'cooperative not found');
    }
    return;
  }
  if (actor.role === 'cooperative_staff' || actor.role === 'collection_agent') {
    const membership = await db.query.cooperativeMembers.findFirst({
      where: and(
        eq(cooperativeMembers.userId, actor.userId),
        eq(cooperativeMembers.cooperativeId, cooperativeId),
        eq(cooperativeMembers.active, true),
      ),
    });
    if (!membership) {
      throw new AuthzError('forbidden', 'not a member of this cooperative');
    }
    return;
  }
  throw new AuthzError('forbidden', `role ${actor.role} is not permitted`);
}

/** Active membership lookup for scoping staff list queries. */
export async function getActiveMemberships(userId: string): Promise<{ cooperativeId: string }[]> {
  const rows = await db
    .select({ cooperativeId: cooperativeMembers.cooperativeId })
    .from(cooperativeMembers)
    .where(and(eq(cooperativeMembers.userId, userId), eq(cooperativeMembers.active, true)));
  return rows;
}

/** Resolve the actor from an incoming request session. Null when anonymous. */
export async function resolveActor(request: Request): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const row = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, session.user.id),
  });
  return { userId: session.user.id, role: row?.role ?? null };
}
