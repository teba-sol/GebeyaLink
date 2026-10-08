import 'server-only';

import type { AuditEntity, AuditEventType, PlatformRole } from '@gebeyalink/types';

import { db } from '../db';
import { auditEvents } from '../db/schema/payments';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditEventInput = {
  eventType: AuditEventType;
  actorId: string | null;
  actorRole: PlatformRole | null;
  entityType: AuditEntity;
  entityId: string;
  orderId?: string;
  cooperativeId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Record an important order/payment state change (docs/prd.md §47).
 * Always called with the same transaction as the change it describes, so
 * audit evidence and the state change commit or roll back together.
 * actorId is null for system transitions (the lazy expiry sweep).
 */
export async function recordAuditEvent(tx: Tx, event: AuditEventInput): Promise<void> {
  await tx.insert(auditEvents).values({
    eventType: event.eventType,
    actorId: event.actorId,
    actorRole: event.actorRole,
    entityType: event.entityType,
    entityId: event.entityId,
    orderId: event.orderId ?? null,
    cooperativeId: event.cooperativeId ?? null,
    metadata: event.metadata ?? null,
  });
}
