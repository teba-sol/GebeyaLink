import 'server-only';

import { and, count, desc, eq, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import type {
  OrderDto,
  PaginatedOrders,
  PaymentStatus,
  RejectionReason,
} from '@gebeyalink/types';
import type {
  ListOrdersQuery,
  PlaceOrderInput,
  RejectOrderInput,
} from '@gebeyalink/validation';

import { recordAuditEvent } from '../audit/events';
import {
  AuthzError,
  type Actor,
  getActiveMemberships,
  requireCooperativeScope,
  requireRole,
} from '../authz/guards';
import { minOrderQuantityKg, responseWindowMs } from '../config/business';
import { db } from '../db';
import { cooperatives } from '../db/schema/cooperatives';
import { inventoryLots } from '../db/schema/inventory';
import { marketplaceListings } from '../db/schema/marketplace';
import { inventoryReservations, orders } from '../db/schema/orders';
import { payments } from '../db/schema/payments';
import { BusinessRuleError } from '../http/errors';

/**
 * Buyer orders + inventory reservations — C4 (docs/prd.md §17–§18;
 * docs/business-domain-model.md §21–§25), extended by C5 (§19–§23).
 *
 * Placing an order atomically moves quantity from available_quantity to
 * reserved_quantity on the C3 lot via a conditional UPDATE, so overselling
 * is impossible under concurrency. Release (expiry/cancellation/rejection)
 * reverses exactly the reserved quantity. C5 adds cooperative
 * accept/reject; acceptance converts the reservation (ACTIVE → CONVERTED)
 * into a commercial commitment without moving lot quantities. All
 * transitions lock the reservation row before the order row — matching
 * releaseReservationTx — so concurrent transitions serialize instead of
 * deadlocking.
 */

const ORDER_READ_ROLES = ['admin', 'cooperative_staff', 'buyer'] as const;

type OrderRow = typeof orders.$inferSelect;
export type { OrderRow };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toDto(row: OrderRow, paymentStatus: PaymentStatus | null = null): OrderDto {
  return {
    id: row.id,
    buyerId: row.buyerId,
    cooperativeId: row.cooperativeId,
    listingId: row.listingId,
    inventoryLotId: row.inventoryLotId,
    productId: row.productId,
    qualityGrade: row.qualityGrade,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    productTotal: row.productTotal,
    status: row.status,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    rejectionExplanation: row.rejectionExplanation,
    paymentStatus,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Latest payment attempt status per order (newest first). An order whose
 * status is PAYMENT_CONFIRMED is always CONFIRMED regardless of attempts.
 */
async function loadPaymentStatuses(orderIds: string[]): Promise<Map<string, PaymentStatus>> {
  const map = new Map<string, PaymentStatus>();
  if (orderIds.length === 0) return map;
  const rows = await db
    .select({ orderId: payments.orderId, status: payments.status })
    .from(payments)
    .where(inArray(payments.orderId, orderIds))
    .orderBy(desc(payments.createdAt), desc(payments.id));
  for (const row of rows) {
    if (!map.has(row.orderId)) map.set(row.orderId, row.status);
  }
  return map;
}

type ReleaseSpec = {
  reason: 'expired' | 'cancelled' | 'rejected';
  orderStatus: 'EXPIRED' | 'CANCELLED' | 'REJECTED';
  rejection?: { reason: RejectionReason; explanation: string | null };
};

/**
 * Release one ACTIVE reservation back to the lot. Conditional guards make
 * the release idempotent: only ACTIVE reservations release, and only when
 * the lot still carries at least the reserved quantity. Returns the
 * updated order row, or null when the reservation was not ACTIVE (the
 * caller decides the error). Throws if the order is somehow no longer
 * PENDING — rolling the whole transaction back, preserving the
 * PENDING ⟺ ACTIVE reservation invariant.
 */
async function releaseReservationTx(tx: Tx, reservationId: string, spec: ReleaseSpec): Promise<OrderRow | null> {
  const [reservation] = await tx
    .update(inventoryReservations)
    .set({
      status: 'RELEASED',
      releasedAt: new Date(),
      releaseReason: spec.reason,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryReservations.id, reservationId), eq(inventoryReservations.status, 'ACTIVE')))
    .returning();
  if (!reservation) {
    return null;
  }

  const released = await tx
    .update(inventoryLots)
    .set({
      availableQuantity: sql`${inventoryLots.availableQuantity} + ${reservation.quantity}`,
      reservedQuantity: sql`${inventoryLots.reservedQuantity} - ${reservation.quantity}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryLots.id, reservation.lotId),
        sql`${inventoryLots.reservedQuantity} >= ${reservation.quantity}`,
      ),
    )
    .returning({ id: inventoryLots.id, status: inventoryLots.status });
  if (released.length === 0) {
    throw new BusinessRuleError(
      'reservation_release_failed',
      'reserved quantity could not be returned to inventory',
    );
  }
  // docs/business-domain-model.md §17: released inventory is AVAILABLE again.
  if (released[0].status === 'RESERVED') {
    await tx
      .update(inventoryLots)
      .set({ status: 'AVAILABLE', updatedAt: new Date() })
      .where(eq(inventoryLots.id, reservation.lotId));
  }

  const [order] = await tx
    .update(orders)
    .set({
      status: spec.orderStatus,
      updatedAt: new Date(),
      ...(spec.rejection
        ? {
            rejectedAt: new Date(),
            rejectionReason: spec.rejection.reason,
            rejectionExplanation: spec.rejection.explanation,
          }
        : {}),
    })
    .where(and(eq(orders.id, reservation.orderId), eq(orders.status, 'PENDING')))
    .returning();
  if (!order) {
    throw new BusinessRuleError('order_state_conflict', 'order is no longer pending');
  }
  return order;
}

/**
 * Lazily expire PENDING orders past their response window
 * (docs/business-domain-model.md §25). Called before browse and placement
 * reads so no background job is required (docs/tech-stack.md §19: no queue
 * infrastructure yet). Idempotent.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const due = await db
    .select()
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.status, 'ACTIVE'),
        lte(inventoryReservations.expiresAt, new Date()),
      ),
    )
    .limit(100);
  if (due.length === 0) return 0;

  let released = 0;
  for (const reservation of due) {
    const expiredOrder = await db.transaction(async (tx) => {
      const order = await releaseReservationTx(tx, reservation.id, {
        reason: 'expired',
        orderStatus: 'EXPIRED',
      });
      if (order) {
        await recordAuditEvent(tx, {
          eventType: 'order.expired',
          actorId: null,
          actorRole: null,
          entityType: 'order',
          entityId: order.id,
          orderId: order.id,
          cooperativeId: order.cooperativeId,
        });
      }
      return order;
    });
    if (expiredOrder) released += 1;
  }
  return released;
}

export async function placeOrder(actor: Actor, input: PlaceOrderInput): Promise<OrderDto> {
  requireRole(actor, 'admin', 'buyer');

  await releaseExpiredReservations();

  const listing = await db.query.marketplaceListings.findFirst({
    where: and(eq(marketplaceListings.id, input.listingId), isNull(marketplaceListings.deletedAt)),
  });
  if (!listing) {
    throw new AuthzError('not_found', 'listing not found');
  }
  if (listing.status !== 'active') {
    throw new BusinessRuleError('listing_not_active', 'listing is not active');
  }

  const cooperative = await db.query.cooperatives.findFirst({
    where: and(eq(cooperatives.id, listing.cooperativeId), isNull(cooperatives.deletedAt)),
  });
  if (!cooperative || cooperative.status !== 'active') {
    throw new BusinessRuleError('cooperative_not_active', 'cooperative is not active');
  }

  const minimum = minOrderQuantityKg();
  if (input.quantity < minimum) {
    throw new BusinessRuleError(
      'below_minimum_order_quantity',
      `order quantity must be at least ${minimum} kg`,
    );
  }

  const order = await db.transaction(async (tx) => {
    // Atomic availability check + reservation (docs/prd.md FR-019/FR-020).
    const reserved = await tx
      .update(inventoryLots)
      .set({
        availableQuantity: sql`${inventoryLots.availableQuantity} - ${input.quantity}`,
        reservedQuantity: sql`${inventoryLots.reservedQuantity} + ${input.quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryLots.id, listing.inventoryLotId),
          isNull(inventoryLots.deletedAt),
          sql`${inventoryLots.availableQuantity} >= ${input.quantity}`,
        ),
      )
      .returning();
    if (reserved.length === 0) {
      throw new BusinessRuleError(
        'insufficient_available_quantity',
        'requested quantity exceeds available inventory',
      );
    }
    const lot = reserved[0];

    // docs/business-domain-model.md §17: a fully reserved lot is RESERVED.
    if (lot.availableQuantity < 0.001 && lot.status === 'AVAILABLE') {
      await tx
        .update(inventoryLots)
        .set({ status: 'RESERVED', updatedAt: new Date() })
        .where(eq(inventoryLots.id, lot.id));
    }

    const expiresAt = new Date(Date.now() + responseWindowMs());
    const [created] = await tx
      .insert(orders)
      .values({
        buyerId: actor.userId,
        cooperativeId: listing.cooperativeId,
        listingId: listing.id,
        inventoryLotId: lot.id,
        productId: lot.productId,
        qualityGrade: lot.qualityGrade,
        quantity: input.quantity,
        unitPrice: listing.pricePerUnit,
        productTotal: Math.round(input.quantity * listing.pricePerUnit * 1000) / 1000,
        status: 'PENDING',
        expiresAt,
      })
      .returning();

    await tx.insert(inventoryReservations).values({
      orderId: created.id,
      lotId: lot.id,
      buyerId: actor.userId,
      quantity: input.quantity,
      status: 'ACTIVE',
      expiresAt,
    });

    await recordAuditEvent(tx, {
      eventType: 'order.placed',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'order',
      entityId: created.id,
      orderId: created.id,
      cooperativeId: listing.cooperativeId,
      metadata: { quantity: input.quantity, productTotal: created.productTotal },
    });

    return created;
  });

  return toDto(order);
}

/** Order visibility boundary: buyer → own orders (404 cross), admin → all,
 * cooperative_staff → active memberships (403 cross). Exported for the
 * payment service so payment reads share the exact same rules. */
export async function requireVisibleOrder(actor: Actor, id: string): Promise<OrderRow> {
  const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!row) {
    throw new AuthzError('not_found', 'order not found');
  }
  if (actor.role === 'buyer') {
    if (row.buyerId !== actor.userId) {
      throw new AuthzError('not_found', 'order not found');
    }
    return row;
  }
  if (actor.role === 'admin') return row;
  if (actor.role === 'cooperative_staff') {
    const memberships = await getActiveMemberships(actor.userId);
    if (memberships.some((m) => m.cooperativeId === row.cooperativeId)) {
      return row;
    }
  }
  throw new AuthzError('forbidden', 'order is outside your scope');
}

export async function getOrder(actor: Actor, id: string): Promise<OrderDto> {
  requireRole(actor, ...ORDER_READ_ROLES);
  await releaseExpiredReservations();
  const order = await requireVisibleOrder(actor, id);
  const statuses = await loadPaymentStatuses([order.id]);
  const paymentStatus =
    order.status === 'PAYMENT_CONFIRMED' ? 'CONFIRMED' : (statuses.get(order.id) ?? null);
  return toDto(order, paymentStatus);
}

export async function listOrders(actor: Actor, query: ListOrdersQuery): Promise<PaginatedOrders> {
  requireRole(actor, ...ORDER_READ_ROLES);
  await releaseExpiredReservations();

  const conds: SQL[] = [];
  if (actor.role === 'buyer') {
    conds.push(eq(orders.buyerId, actor.userId));
  } else if (actor.role === 'cooperative_staff') {
    const memberships = await getActiveMemberships(actor.userId);
    const ids = memberships.map((m) => m.cooperativeId);
    if (ids.length === 0) {
      return { items: [], page: query.page, limit: query.limit, total: 0 };
    }
    conds.push(inArray(orders.cooperativeId, ids));
  }
  if (query.status) conds.push(eq(orders.status, query.status));

  const where = conds.length > 0 ? and(...conds) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(orders).where(where);
  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const statuses = await loadPaymentStatuses(rows.map((r) => r.id));

  return {
    items: rows.map((r) =>
      toDto(r, r.status === 'PAYMENT_CONFIRMED' ? 'CONFIRMED' : (statuses.get(r.id) ?? null)),
    ),
    page: query.page,
    limit: query.limit,
    total: totalRow.value,
  };
}

/**
 * Buyer cancels a still-PENDING order; the reservation returns to available
 * (docs/user-flows.md §19). Cancellation after acceptance is not possible
 * (docs/prd.md §21) — acceptance state is now enforced by C5.
 */
export async function cancelOrder(actor: Actor, id: string): Promise<OrderDto> {
  requireRole(actor, 'admin', 'buyer');
  const order = await requireVisibleOrder(actor, id);

  if (order.status !== 'PENDING') {
    throw new BusinessRuleError('order_not_cancellable', 'only pending orders can be cancelled');
  }

  await db.transaction(async (tx) => {
    const reservation = await tx.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.orderId, order.id),
    });
    if (!reservation) {
      throw new BusinessRuleError('reservation_missing', 'order has no reservation to release');
    }
    // The conditional release is the concurrency gate: if acceptance (or
    // expiry) won the race, the reservation is no longer ACTIVE and the
    // cancellation must fail instead of silently no-op (docs/prd.md §21).
    const cancelled = await releaseReservationTx(tx, reservation.id, {
      reason: 'cancelled',
      orderStatus: 'CANCELLED',
    });
    if (!cancelled) {
      throw new BusinessRuleError('order_not_cancellable', 'only pending orders can be cancelled');
    }
    await recordAuditEvent(tx, {
      eventType: 'order.cancelled',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'order',
      entityId: order.id,
      orderId: order.id,
      cooperativeId: order.cooperativeId,
    });
  });

  const updated = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  const statuses = await loadPaymentStatuses([id]);
  return toDto(updated as OrderRow, statuses.get(id) ?? null);
}

/**
 * Cooperative accepts a PENDING order (docs/prd.md §19.1). The reservation
 * becomes a commercial commitment: ACTIVE → CONVERTED, quantity stays
 * reserved on the C3 lot (it can never return to available), and the
 * snapshotted price/quantity are untouched (price lock, BR-014). Lazy
 * expiry runs first so a due order is EXPIRED before anyone can accept it.
 */
export async function acceptOrder(actor: Actor, id: string): Promise<OrderDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  await releaseExpiredReservations();

  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) {
    throw new AuthzError('not_found', 'order not found');
  }
  await requireCooperativeScope(actor, order.cooperativeId);

  const accepted = await db.transaction(async (tx) => {
    // Lock reservation before order — same order as releaseReservationTx —
    // so accept/expire/cancel/accept serialize instead of deadlocking.
    const [reservation] = await tx
      .update(inventoryReservations)
      .set({ status: 'CONVERTED', updatedAt: new Date() })
      .where(
        and(
          eq(inventoryReservations.orderId, id),
          eq(inventoryReservations.status, 'ACTIVE'),
        ),
      )
      .returning();
    if (!reservation) {
      throw new BusinessRuleError('order_not_pending', 'order is not awaiting a response');
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: 'ACCEPTED', acceptedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, 'PENDING')))
      .returning();
    if (!updated) {
      throw new BusinessRuleError('order_not_pending', 'order is not awaiting a response');
    }

    await recordAuditEvent(tx, {
      eventType: 'order.accepted',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'order',
      entityId: id,
      orderId: id,
      cooperativeId: order.cooperativeId,
    });
    return updated;
  });

  return toDto(accepted);
}

/**
 * Cooperative rejects a PENDING order (docs/prd.md §19.2): reason
 * required, reserved inventory released, order REJECTED — all in one
 * transaction. Runs the lazy expiry sweep first so due orders expire
 * instead of being rejected late.
 */
export async function rejectOrder(actor: Actor, id: string, input: RejectOrderInput): Promise<OrderDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  await releaseExpiredReservations();

  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) {
    throw new AuthzError('not_found', 'order not found');
  }
  await requireCooperativeScope(actor, order.cooperativeId);

  if (order.status !== 'PENDING') {
    throw new BusinessRuleError('order_not_pending', 'order is not awaiting a response');
  }

  const rejected = await db.transaction(async (tx) => {
    const reservation = await tx.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.orderId, order.id),
    });
    if (!reservation) {
      throw new BusinessRuleError('reservation_missing', 'order has no reservation to release');
    }
    const updated = await releaseReservationTx(tx, reservation.id, {
      reason: 'rejected',
      orderStatus: 'REJECTED',
      rejection: { reason: input.rejectionReason, explanation: input.explanation ?? null },
    });
    if (!updated) {
      throw new BusinessRuleError('order_not_pending', 'order is not awaiting a response');
    }
    await recordAuditEvent(tx, {
      eventType: 'order.rejected',
      actorId: actor.userId,
      actorRole: actor.role,
      entityType: 'order',
      entityId: order.id,
      orderId: order.id,
      cooperativeId: order.cooperativeId,
      metadata: { rejectionReason: input.rejectionReason },
    });
    return updated;
  });

  return toDto(rejected);
}
