import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  AuditEventType,
  PlatformRole,
  VerificationOrgType,
  VerificationRequestDto,
  VerificationStatus,
} from '@gebeyalink/types';
import type { ListVerificationsQuery, VerificationActionInput } from '@gebeyalink/validation';

import { AuthzError, type Actor, requireRole } from '../authz/guards';
import { recordAuditEvent } from '../audit/events';
import { db } from '../db';
import { user } from '../db/schema/auth';
import { buyers } from '../db/schema/buyers';
import { cooperativeMembers, cooperatives } from '../db/schema/cooperatives';
import { transporters } from '../db/schema/transporters';
import { userRoles } from '../db/schema/user-roles';
import { BusinessRuleError } from '../http/errors';

/**
 * Organization verification (docs/prd.md §7, §42; docs/user-flows.md §3).
 *
 * Admin-only queue over cooperatives, buyers and transporters. Approving a
 * registration grants the applicant the corresponding platform role
 * (+ cooperative membership for staff); every transition is audited.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PaginatedVerificationRequests = {
  items: VerificationRequestDto[];
  page: number;
  limit: number;
  total: number;
};

const ACTION_STATUS: Record<VerificationActionInput['action'], VerificationStatus> = {
  under_review: 'under_review',
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
};

const ACTION_AUDIT: Record<VerificationActionInput['action'], AuditEventType> = {
  under_review: 'verification.under_review',
  approve: 'verification.approved',
  reject: 'verification.rejected',
  suspend: 'verification.suspended',
};

/** Allowed source → target verification transitions. */
const TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected', 'under_review'],
  approved: ['suspended'],
  rejected: ['under_review', 'approved'],
  suspended: ['approved'],
};

const GRANT_ROLE: Record<VerificationOrgType, PlatformRole> = {
  cooperative: 'cooperative_staff',
  buyer: 'buyer',
  transporter: 'transporter',
};

type OrgRow = { verificationStatus: VerificationStatus; submittedByUserId: string | null };

function rowToDto(
  type: VerificationOrgType,
  row: {
    id: string;
    name: string;
    status: VerificationStatus;
    reviewNote: string | null;
    submittedByUserId: string | null;
    region: string | null;
    submittedAt: Date;
    submitterName: string | null;
    submitterEmail: string | null;
  },
): VerificationRequestDto {
  return {
    id: row.id,
    type,
    name: row.name,
    status: row.status,
    reviewNote: row.reviewNote,
    submittedByUserId: row.submittedByUserId,
    submittedByName: row.submitterName,
    submittedByEmail: row.submitterEmail,
    region: row.region,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export async function listVerificationQueue(
  actor: Actor,
  query: ListVerificationsQuery,
): Promise<PaginatedVerificationRequests> {
  requireRole(actor, 'admin');

  const items: VerificationRequestDto[] = [];

  if (!query.type || query.type === 'cooperative') {
    const rows = await db
      .select({
        id: cooperatives.id,
        name: cooperatives.name,
        status: cooperatives.verificationStatus,
        reviewNote: cooperatives.reviewNote,
        submittedByUserId: cooperatives.submittedByUserId,
        region: cooperatives.region,
        submittedAt: cooperatives.createdAt,
        submitterName: user.name,
        submitterEmail: user.email,
      })
      .from(cooperatives)
      .leftJoin(user, eq(cooperatives.submittedByUserId, user.id))
      .where(
        and(
          isNull(cooperatives.deletedAt),
          query.status ? eq(cooperatives.verificationStatus, query.status) : undefined,
        ),
      )
      .orderBy(asc(cooperatives.createdAt));
    for (const row of rows) items.push(rowToDto('cooperative', row));
  }

  if (!query.type || query.type === 'buyer') {
    const rows = await db
      .select({
        id: buyers.id,
        name: buyers.organizationName,
        status: buyers.verificationStatus,
        reviewNote: buyers.reviewNote,
        submittedByUserId: buyers.userId,
        region: buyers.region,
        submittedAt: buyers.createdAt,
        submitterName: user.name,
        submitterEmail: user.email,
      })
      .from(buyers)
      .leftJoin(user, eq(buyers.userId, user.id))
      .where(
        and(
          isNull(buyers.deletedAt),
          query.status ? eq(buyers.verificationStatus, query.status) : undefined,
        ),
      )
      .orderBy(asc(buyers.createdAt));
    for (const row of rows) items.push(rowToDto('buyer', row));
  }

  if (!query.type || query.type === 'transporter') {
    const rows = await db
      .select({
        id: transporters.id,
        name: transporters.companyName,
        status: transporters.verificationStatus,
        reviewNote: transporters.reviewNote,
        submittedByUserId: transporters.userId,
        region: transporters.region,
        submittedAt: transporters.createdAt,
        submitterName: user.name,
        submitterEmail: user.email,
      })
      .from(transporters)
      .leftJoin(user, eq(transporters.userId, user.id))
      .where(
        and(
          isNull(transporters.deletedAt),
          query.status ? eq(transporters.verificationStatus, query.status) : undefined,
        ),
      )
      .orderBy(asc(transporters.createdAt));
    for (const row of rows) items.push(rowToDto('transporter', row));
  }

  items.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const total = items.length;
  const start = (query.page - 1) * query.limit;
  return {
    items: items.slice(start, start + query.limit),
    page: query.page,
    limit: query.limit,
    total,
  };
}

async function loadOrg(tx: Tx, type: VerificationOrgType, id: string): Promise<OrgRow> {
  if (type === 'cooperative') {
    const row = await tx.query.cooperatives.findFirst({
      where: and(eq(cooperatives.id, id), isNull(cooperatives.deletedAt)),
    });
    if (!row) throw new AuthzError('not_found', 'cooperative not found');
    return { verificationStatus: row.verificationStatus, submittedByUserId: row.submittedByUserId };
  }
  if (type === 'buyer') {
    const row = await tx.query.buyers.findFirst({
      where: and(eq(buyers.id, id), isNull(buyers.deletedAt)),
    });
    if (!row) throw new AuthzError('not_found', 'buyer not found');
    return { verificationStatus: row.verificationStatus, submittedByUserId: row.userId };
  }
  const row = await tx.query.transporters.findFirst({
    where: and(eq(transporters.id, id), isNull(transporters.deletedAt)),
  });
  if (!row) throw new AuthzError('not_found', 'transporter not found');
  return { verificationStatus: row.verificationStatus, submittedByUserId: row.userId };
}

async function persistReview(
  tx: Tx,
  type: VerificationOrgType,
  id: string,
  patch: {
    verificationStatus: VerificationStatus;
    reviewNote: string | null;
    reviewedByUserId: string;
    reviewedAt: Date;
  },
): Promise<void> {
  if (type === 'cooperative') {
    await tx.update(cooperatives).set({ ...patch, updatedAt: new Date() }).where(eq(cooperatives.id, id));
  } else if (type === 'buyer') {
    await tx.update(buyers).set({ ...patch, updatedAt: new Date() }).where(eq(buyers.id, id));
  } else {
    await tx.update(transporters).set({ ...patch, updatedAt: new Date() }).where(eq(transporters.id, id));
  }
}

/** Grant the applicant their role (+ coop membership) if not already assigned. */
async function grantAccess(
  tx: Tx,
  type: VerificationOrgType,
  orgId: string,
  userId: string | null,
): Promise<void> {
  if (!userId) return;
  const [existing] = await tx.select().from(userRoles).where(eq(userRoles.userId, userId));
  if (!existing) {
    await tx.insert(userRoles).values({ userId, role: GRANT_ROLE[type] });
  }
  if (type === 'cooperative') {
    await tx
      .insert(cooperativeMembers)
      .values({ cooperativeId: orgId, userId, active: true })
      .onConflictDoUpdate({
        target: [cooperativeMembers.cooperativeId, cooperativeMembers.userId],
        set: { active: true, updatedAt: new Date() },
      });
  }
}

export async function applyVerification(
  actor: Actor,
  type: VerificationOrgType,
  id: string,
  input: VerificationActionInput,
): Promise<{ id: string; type: VerificationOrgType; status: VerificationStatus }> {
  requireRole(actor, 'admin');
  const target = ACTION_STATUS[input.action];
  const note = input.note ?? null;

  return db.transaction(async (tx) => {
    const org = await loadOrg(tx, type, id);
    if (!TRANSITIONS[org.verificationStatus].includes(target)) {
      throw new BusinessRuleError(
        'invalid_transition',
        `cannot move a ${org.verificationStatus} registration to ${target}`,
      );
    }

    await persistReview(tx, type, id, {
      verificationStatus: target,
      reviewNote: note,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    });

    if (target === 'approved') {
      await grantAccess(tx, type, id, org.submittedByUserId);
    }

    await recordAuditEvent(tx, {
      eventType: ACTION_AUDIT[input.action],
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: type,
      entityId: id,
      cooperativeId: type === 'cooperative' ? id : undefined,
      metadata: { status: target, note },
    });

    return { id, type, status: target };
  });
}
