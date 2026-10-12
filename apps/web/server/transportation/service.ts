import 'server-only';

import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type { ShipmentDto, ShipmentStatus } from '@gebeyalink/types';
import type {
  AssignTransporterInput,
  CancelShipmentInput,
  ConfirmDeliveryInput,
  ConfirmPickupInput,
  CreateShipmentInput,
  DeliverShipmentInput,
} from '@gebeyalink/validation';

import { recordAuditEvent } from '../audit/events';
import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { db } from '../db';
import { orders } from '../db/schema/orders';
import { shipments } from '../db/schema/shipments';
import { transporters } from '../db/schema/transporters';
import { BusinessRuleError } from '../http/errors';
import { requireVisibleOrder } from '../orders/service';

/**
 * Shipments — transport arrangement, pickup, and delivery — C6
 * (docs/prd.md §24–§30, §41; FR-028/FR-030/FR-031).
 *
 * The order keeps the commercial lifecycle; the shipment keeps the
 * fulfilment journey (`ShipmentStatus`). Pickup needs both the cooperative
 * and the transporter to confirm (docs/prd.md §26); only then does the
 * shipment move to IN_TRANSIT. Delivery is marked by the transporter and
 * confirmed by the buyer, which flips the order to COMPLETED and transfers
 * ownership (docs/prd.md §29–§30).
 *
 * Payment gate (FR-028): a shipment only exists once the order is
 * PAYMENT_CONFIRMED, and every pickup confirmation re-checks that the order
 * has not left that state, so pickup can never precede confirmed payment.
 */

type ShipmentRow = typeof shipments.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SHIPMENT_WRITE_ROLES = ['admin', 'cooperative_staff', 'transporter'] as const;

function toDto(row: ShipmentRow): ShipmentDto {
  return {
    id: row.id,
    orderId: row.orderId,
    cooperativeId: row.cooperativeId,
    transporterId: row.transporterId,
    transporterUserId: row.transporterUserId,
    transporterKind: row.transporterKind,
    transporterName: row.transporterName,
    transporterPhone: row.transporterPhone,
    vehicleType: row.vehicleType,
    vehiclePlate: row.vehiclePlate,
    driverName: row.driverName,
    pickupLocation: row.pickupLocation,
    destination: row.destination,
    transportCost: row.transportCost,
    status: row.status,
    scheduledPickupAt: row.scheduledPickupAt?.toISOString() ?? null,
    expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
    coopPickupConfirmedAt: row.coopPickupConfirmedAt?.toISOString() ?? null,
    transporterPickupConfirmedAt: row.transporterPickupConfirmedAt?.toISOString() ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    deliveryConfirmedAt: row.deliveryConfirmedAt?.toISOString() ?? null,
    deliveryReceivedQuantity: row.deliveryReceivedQuantity,
    deliveryCondition: row.deliveryCondition,
    deliveryNotes: row.deliveryNotes,
    cancelReason: row.cancelReason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Shipment visibility mirrors order visibility, plus the assigned transporter. */
async function assertVisible(actor: Actor, row: ShipmentRow): Promise<void> {
  if (actor.role === 'admin') return;
  if (actor.role === 'transporter') {
    if (row.transporterUserId === actor.userId) return;
    throw new AuthzError('forbidden', 'shipment is not assigned to you');
  }
  await requireVisibleOrder(actor, row.orderId);
}

async function loadShipment(id: string): Promise<ShipmentRow> {
  const row = await db.query.shipments.findFirst({ where: eq(shipments.id, id) });
  if (!row) {
    throw new AuthzError('not_found', 'shipment not found');
  }
  return row;
}

/** The shipment for an order, or null when transport is not yet arranged. */
export async function getShipmentByOrder(actor: Actor, orderId: string): Promise<ShipmentDto | null> {
  requireRole(actor, ...SHIPMENT_WRITE_ROLES, 'buyer');
  const row = await db.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
  if (!row) return null;
  await assertVisible(actor, row);
  return toDto(row);
}

export async function getShipment(actor: Actor, id: string): Promise<ShipmentDto> {
  requireRole(actor, ...SHIPMENT_WRITE_ROLES, 'buyer');
  const row = await loadShipment(id);
  await assertVisible(actor, row);
  return toDto(row);
}

/** Shipments assigned to the signed-in transporter (docs/prd.md §41). */
export async function listTransporterShipments(
  actor: Actor,
  status?: ShipmentStatus,
): Promise<ShipmentDto[]> {
  requireRole(actor, 'admin', 'transporter');
  const conds: SQL[] = [];
  if (actor.role === 'transporter') conds.push(eq(shipments.transporterUserId, actor.userId));
  if (status) conds.push(eq(shipments.status, status));
  const rows = await db
    .select()
    .from(shipments)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(shipments.createdAt));
  return rows.map(toDto);
}

/** Shipments across the user's cooperatives, newest first (coop ops console). */
export async function listCoopShipments(
  actor: Actor,
  status?: ShipmentStatus,
): Promise<ShipmentDto[]> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const conds: SQL[] = [];
  if (actor.role === 'cooperative_staff') {
    const memberships = await getActiveMemberships(actor.userId);
    const ids = memberships.map((m) => m.cooperativeId);
    if (ids.length === 0) return [];
    conds.push(inArray(shipments.cooperativeId, ids));
  }
  if (status) conds.push(eq(shipments.status, status));
  const rows = await db
    .select()
    .from(shipments)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(shipments.createdAt));
  return rows.map(toDto);
}

/** Resolve a transporter choice (platform row or external details) into snapshot fields. */
async function resolveTransporter(input: {
  transporterId?: string;
  externalTransporterName?: string;
  externalTransporterPhone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  driverName?: string;
}): Promise<{
  transporterId: string | null;
  transporterUserId: string | null;
  transporterKind: 'platform' | 'external';
  transporterName: string;
  transporterPhone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
}> {
  if (input.transporterId) {
    const row = await db.query.transporters.findFirst({
      where: and(eq(transporters.id, input.transporterId), isNull(transporters.deletedAt)),
    });
    if (!row) {
      throw new AuthzError('not_found', 'transporter not found');
    }
    if (row.verificationStatus !== 'approved') {
      throw new BusinessRuleError(
        'transporter_not_approved',
        'only approved transporters can be assigned to a shipment',
      );
    }
    return {
      transporterId: row.id,
      transporterUserId: row.userId,
      transporterKind: 'platform',
      transporterName: row.companyName,
      transporterPhone: input.externalTransporterPhone ?? row.phone,
      vehicleType: input.vehicleType ?? row.vehicleType,
      vehiclePlate: input.vehiclePlate ?? row.vehiclePlate,
      driverName: input.driverName ?? row.driverName,
    };
  }
  if (input.externalTransporterName) {
    return {
      transporterId: null,
      transporterUserId: null,
      transporterKind: 'external',
      transporterName: input.externalTransporterName,
      transporterPhone: input.externalTransporterPhone ?? null,
      vehicleType: input.vehicleType ?? null,
      vehiclePlate: input.vehiclePlate ?? null,
      driverName: input.driverName ?? null,
    };
  }
  throw new BusinessRuleError(
    'transporter_required',
    'select a platform transporter or provide an external transporter name',
  );
}

/**
 * Cooperative (or admin) arranges transport for a PAYMENT_CONFIRMED order
 * (docs/prd.md §24, FR-028). One shipment per order; the transporter is
 * optional at creation — a shipment with no transporter stays
 * TRANSPORT_PENDING until one is assigned.
 */
export async function createShipment(
  actor: Actor,
  orderId: string,
  input: CreateShipmentInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const order = await requireVisibleOrder(actor, orderId);
  await requireCooperativeScope(actor, order.cooperativeId);

  if (order.status !== 'PAYMENT_CONFIRMED') {
    throw new BusinessRuleError(
      'order_not_payment_confirmed',
      'transport can only be arranged after payment is confirmed',
    );
  }

  const existing = await db.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
  if (existing) {
    throw new BusinessRuleError('shipment_exists', 'transport is already arranged for this order');
  }

  const hasTransporter = Boolean(input.transporterId || input.externalTransporterName);
  const snapshot = hasTransporter ? await resolveTransporter(input) : null;

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(shipments)
      .values({
        orderId,
        cooperativeId: order.cooperativeId,
        transporterId: snapshot?.transporterId ?? null,
        transporterUserId: snapshot?.transporterUserId ?? null,
        transporterKind: snapshot?.transporterKind ?? 'external',
        transporterName: snapshot?.transporterName ?? 'To be arranged',
        transporterPhone: snapshot?.transporterPhone ?? null,
        vehicleType: snapshot?.vehicleType ?? null,
        vehiclePlate: snapshot?.vehiclePlate ?? null,
        driverName: snapshot?.driverName ?? null,
        pickupLocation: input.pickupLocation,
        destination: input.destination,
        transportCost: input.transportCost ?? null,
        status: snapshot ? 'PICKUP_PENDING' : 'TRANSPORT_PENDING',
        scheduledPickupAt: input.scheduledPickupAt ?? null,
        expectedDeliveryAt: input.expectedDeliveryAt ?? null,
        createdByUserId: actor.userId,
      })
      .returning();
    await recordAuditEvent(tx, {
      eventType: 'shipment.created',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: row.id,
      orderId,
      cooperativeId: row.cooperativeId,
      metadata: { transporterKind: row.transporterKind, hasTransporter },
    });
    return row;
  });
  return toDto(created);
}

export async function assignTransporter(
  actor: Actor,
  id: string,
  input: AssignTransporterInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const existing = await loadShipment(id);
  await requireCooperativeScope(actor, existing.cooperativeId);
  if (existing.status !== 'TRANSPORT_PENDING' && existing.status !== 'PICKUP_PENDING') {
    throw new BusinessRuleError('shipment_not_assignable', 'transporter can no longer be changed');
  }
  const snapshot = await resolveTransporter(input);
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shipments)
      .set({ ...snapshot, status: 'PICKUP_PENDING', updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    await recordAuditEvent(tx, {
      eventType: 'shipment.transporter_assigned',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
      metadata: { transporterKind: row.transporterKind },
    });
    return row;
  });
  return toDto(updated);
}

/** Shared dual-confirmation rollover: both sides done → IN_TRANSIT. */
async function advancePickupIfReady(tx: Tx, id: string): Promise<ShipmentRow> {
  const [current] = await tx.select().from(shipments).where(eq(shipments.id, id));
  if (current.coopPickupConfirmedAt && current.transporterPickupConfirmedAt) {
    const [row] = await tx
      .update(shipments)
      .set({ status: 'IN_TRANSIT', dispatchedAt: new Date(), updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return row;
  }
  return current;
}

/**
 * Cooperative confirms handover (docs/prd.md §26.1, FR-030). The transporter
 * then confirms receipt; only when both are recorded does the shipment move
 * to IN_TRANSIT. Blocked before payment is confirmed (FR-028).
 */
export async function confirmCoopPickup(
  actor: Actor,
  id: string,
  input: ConfirmPickupInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const existing = await loadShipment(id);
  await requireCooperativeScope(actor, existing.cooperativeId);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, existing.orderId) });
  if (!order || order.status !== 'PAYMENT_CONFIRMED') {
    throw new BusinessRuleError('pickup_blocked', 'pickup is blocked until payment is confirmed');
  }
  if (existing.status !== 'PICKUP_PENDING' && existing.status !== 'PICKUP_CONFIRMED') {
    throw new BusinessRuleError('pickup_not_available', 'shipment is not awaiting pickup');
  }
  const updated = await db.transaction(async (tx) => {
    await tx
      .update(shipments)
      .set({ coopPickupConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(shipments.id, id));
    const row = await advancePickupIfReady(tx, id);
    await recordAuditEvent(tx, {
      eventType: row.status === 'IN_TRANSIT' ? 'shipment.dispatched' : 'shipment.pickup_confirmed',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
      metadata: { side: 'cooperative', note: input.note ?? null },
    });
    return row;
  });
  return toDto(updated);
}

/** Transporter confirms receipt of goods at pickup (docs/prd.md §26.2, FR-030). */
export async function confirmTransporterPickup(
  actor: Actor,
  id: string,
  input: ConfirmPickupInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'transporter');
  const existing = await loadShipment(id);
  if (actor.role === 'transporter' && existing.transporterUserId !== actor.userId) {
    throw new AuthzError('forbidden', 'shipment is not assigned to you');
  }
  const order = await db.query.orders.findFirst({ where: eq(orders.id, existing.orderId) });
  if (!order || order.status !== 'PAYMENT_CONFIRMED') {
    throw new BusinessRuleError('pickup_blocked', 'pickup is blocked until payment is confirmed');
  }
  if (existing.status !== 'PICKUP_PENDING' && existing.status !== 'PICKUP_CONFIRMED') {
    throw new BusinessRuleError('pickup_not_available', 'shipment is not awaiting pickup');
  }
  const updated = await db.transaction(async (tx) => {
    await tx
      .update(shipments)
      .set({ transporterPickupConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(shipments.id, id));
    const row = await advancePickupIfReady(tx, id);
    await recordAuditEvent(tx, {
      eventType: row.status === 'IN_TRANSIT' ? 'shipment.dispatched' : 'shipment.pickup_confirmed',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
      metadata: { side: 'transporter', note: input.note ?? null },
    });
    return row;
  });
  return toDto(updated);
}

/** Transporter (or coop/admin) marks the goods delivered (docs/prd.md §27). */
export async function markDelivered(
  actor: Actor,
  id: string,
  input: DeliverShipmentInput,
): Promise<ShipmentDto> {
  requireRole(actor, ...SHIPMENT_WRITE_ROLES);
  const existing = await loadShipment(id);
  await assertVisible(actor, existing);
  if (existing.status !== 'IN_TRANSIT' && existing.status !== 'DELAYED') {
    throw new BusinessRuleError('shipment_not_in_transit', 'only an in-transit shipment can be delivered');
  }
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shipments)
      .set({
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryReceivedQuantity: input.receivedQuantity ?? null,
        deliveryCondition: input.condition,
        deliveryNotes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();
    await recordAuditEvent(tx, {
      eventType: 'shipment.delivered',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
      metadata: { condition: input.condition },
    });
    return row;
  });
  return toDto(updated);
}

/**
 * Buyer confirms delivery (docs/prd.md §30): shipment → DELIVERY_CONFIRMED
 * and order → COMPLETED in one transaction. Ownership transfers here
 * (docs/prd.md §29). The transporter or admin may record the confirmation
 * on the buyer's behalf (roles table §44).
 */
export async function confirmDelivery(
  actor: Actor,
  id: string,
  input: ConfirmDeliveryInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'buyer', 'transporter');
  const existing = await loadShipment(id);
  await assertVisible(actor, existing);
  if (existing.status !== 'DELIVERED') {
    throw new BusinessRuleError('shipment_not_delivered', 'only a delivered shipment can be confirmed');
  }
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shipments)
      .set({
        status: 'DELIVERY_CONFIRMED',
        deliveryConfirmedAt: new Date(),
        deliveryNotes: input.notes ?? existing.deliveryNotes,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();
    await tx
      .update(orders)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(and(eq(orders.id, row.orderId), eq(orders.status, 'PAYMENT_CONFIRMED')));
    await recordAuditEvent(tx, {
      eventType: 'shipment.delivery_confirmed',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
    });
    await recordAuditEvent(tx, {
      eventType: 'order.completed',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'order',
      entityId: row.orderId,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
    });
    return row;
  });
  return toDto(updated);
}

/** Cooperative/admin cancels transport before delivery is confirmed. */
export async function cancelShipment(
  actor: Actor,
  id: string,
  input: CancelShipmentInput,
): Promise<ShipmentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const existing = await loadShipment(id);
  await requireCooperativeScope(actor, existing.cooperativeId);
  if (existing.status === 'DELIVERED' || existing.status === 'DELIVERY_CONFIRMED') {
    throw new BusinessRuleError('shipment_not_cancellable', 'a delivered shipment cannot be cancelled');
  }
  if (existing.status === 'CANCELLED') {
    throw new BusinessRuleError('shipment_not_cancellable', 'shipment is already cancelled');
  }
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shipments)
      .set({ status: 'CANCELLED', cancelReason: input.reason, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    await recordAuditEvent(tx, {
      eventType: 'shipment.cancelled',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'shipment',
      entityId: id,
      orderId: row.orderId,
      cooperativeId: row.cooperativeId,
      metadata: { reason: input.reason },
    });
    return row;
  });
  return toDto(updated);
}
