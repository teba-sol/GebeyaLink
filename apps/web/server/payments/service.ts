import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import type { PaymentDto } from '@gebeyalink/types';
import type { FailPaymentInput, SubmitPaymentInput } from '@gebeyalink/validation';

import { recordAuditEvent } from '../audit/events';
import { AuthzError, type Actor, requireRole } from '../authz/guards';
import { db } from '../db';
import { orders } from '../db/schema/orders';
import { payments } from '../db/schema/payments';
import { BusinessRuleError } from '../http/errors';
import { type OrderRow, requireVisibleOrder } from '../orders/service';

/**
 * Payment recording — C5 (docs/prd.md §23; docs/business-domain-model-
 * model.md §30–§32).
 *
 * The buyer pays the cooperative directly; GebeyaLink never holds,
 * processes, or transfers funds (BR-016/BR-017). This module records the
 * buyer's payment attempt, lets the cooperative attest receipt (FR-027),
 * and flips the order to PAYMENT_CONFIRMED — the gate C6 will require
 * before pickup (FR-028). Full product payment only (BR-015); transport
 * payment is C6's concern (BR-019).
 */

const PAYMENT_READ_ROLES = ['admin', 'cooperative_staff', 'buyer'] as const;

type PaymentRow = typeof payments.$inferSelect;

function toDto(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    orderId: row.orderId,
    buyerId: row.buyerId,
    amount: row.amount,
    status: row.status,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireVisiblePayment(
  actor: Actor,
  id: string,
): Promise<{ payment: PaymentRow; order: OrderRow }> {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, id) });
  if (!payment) {
    throw new AuthzError('not_found', 'payment not found');
  }
  const order = await requireVisibleOrder(actor, payment.orderId);
  return { payment, order };
}

/**
 * Buyer (or admin) submits a payment attempt for an ACCEPTED order. The
 * amount must equal the order's product total exactly — full payment only
 * (docs/prd.md BR-015); partial payments are unsupported. At most one
 * PENDING attempt per order, enforced by a partial unique index with a
 * pre-check for the friendly error path.
 */
export async function submitPayment(
  actor: Actor,
  orderId: string,
  input: SubmitPaymentInput,
): Promise<PaymentDto> {
  requireRole(actor, 'admin', 'buyer');
  const order = await requireVisibleOrder(actor, orderId);

  if (order.status !== 'ACCEPTED') {
    throw new BusinessRuleError('order_not_accepted', 'payment can only be submitted for an accepted order');
  }
  if (Math.round(input.amount * 1000) !== Math.round(order.productTotal * 1000)) {
    throw new BusinessRuleError(
      'payment_amount_mismatch',
      'payment amount must equal the order product total',
    );
  }

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx.query.payments.findFirst({
        where: and(eq(payments.orderId, order.id), eq(payments.status, 'PENDING')),
      });
      if (existing) {
        throw new BusinessRuleError(
          'payment_already_pending',
          'a payment attempt is already awaiting confirmation',
        );
      }
      const [created] = await tx
        .insert(payments)
        .values({
          orderId: order.id,
          buyerId: order.buyerId,
          amount: input.amount,
          method: input.method ?? null,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      await recordAuditEvent(tx, {
        eventType: 'payment.submitted',
        actorId: actor.userId,
        actorRole: actor.role,
        entityType: 'payment',
        entityId: created.id,
        orderId: order.id,
        cooperativeId: order.cooperativeId,
        metadata: { amount: created.amount },
      });
      return toDto(created);
    });
  } catch (error) {
    // Partial unique index backstop for concurrent submissions.
    if ((error as { code?: unknown }).code === '23505') {
      throw new BusinessRuleError(
        'payment_already_pending',
        'a payment attempt is already awaiting confirmation',
      );
    }
    throw error;
  }
}

/** Payment attempt history for an order, newest first (docs/prd.md §49). */
export async function listPayments(actor: Actor, orderId: string): Promise<PaymentDto[]> {
  requireRole(actor, ...PAYMENT_READ_ROLES);
  const order = await requireVisibleOrder(actor, orderId);
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, order.id))
    .orderBy(desc(payments.createdAt), desc(payments.id));
  return rows.map(toDto);
}

export async function getPayment(actor: Actor, id: string): Promise<PaymentDto> {
  requireRole(actor, ...PAYMENT_READ_ROLES);
  const { payment } = await requireVisiblePayment(actor, id);
  return toDto(payment);
}

/**
 * Cooperative attests receipt of the buyer's direct payment (FR-027):
 * payment PENDING → CONFIRMED and order ACCEPTED → PAYMENT_CONFIRMED in
 * one transaction, so an accepted order is never half-confirmed
 * (docs/prd.md §56: acceptance ≠ payment).
 */
export async function confirmPayment(actor: Actor, id: string): Promise<PaymentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const { payment, order } = await requireVisiblePayment(actor, id);

  return toDto(
    await db.transaction(async (tx) => {
      const [confirmed] = await tx
        .update(payments)
        .set({
          status: 'CONFIRMED',
          confirmedBy: actor.userId,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(payments.id, payment.id), eq(payments.status, 'PENDING')))
        .returning();
      if (!confirmed) {
        throw new BusinessRuleError('payment_not_pending', 'payment is not awaiting confirmation');
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({ status: 'PAYMENT_CONFIRMED', updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'ACCEPTED')))
        .returning();
      if (!updatedOrder) {
        throw new BusinessRuleError('order_not_accepted', 'order is not in an accepted state');
      }

      await recordAuditEvent(tx, {
        eventType: 'payment.confirmed',
        actorId: actor.userId,
        actorRole: actor.role,
        entityType: 'payment',
        entityId: confirmed.id,
        orderId: order.id,
        cooperativeId: order.cooperativeId,
        metadata: { amount: confirmed.amount },
      });
      return confirmed;
    }),
  );
}

/**
 * Cooperative records that the payment was not received (docs/prd.md
 * §23.3 Failed / Edge Case 8): payment PENDING → FAILED with a reason;
 * the order stays ACCEPTED and unresolved until a new attempt succeeds or
 * an appropriate cancellation occurs.
 */
export async function failPayment(actor: Actor, id: string, input: FailPaymentInput): Promise<PaymentDto> {
  requireRole(actor, 'admin', 'cooperative_staff');
  const { payment, order } = await requireVisiblePayment(actor, id);

  return toDto(
    await db.transaction(async (tx) => {
      const [failed] = await tx
        .update(payments)
        .set({
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: input.reason,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.id, payment.id), eq(payments.status, 'PENDING')))
        .returning();
      if (!failed) {
        throw new BusinessRuleError('payment_not_pending', 'payment is not awaiting confirmation');
      }

      await recordAuditEvent(tx, {
        eventType: 'payment.failed',
        actorId: actor.userId,
        actorRole: actor.role,
        entityType: 'payment',
        entityId: failed.id,
        orderId: order.id,
        cooperativeId: order.cooperativeId,
        metadata: { reason: input.reason },
      });
      return failed;
    }),
  );
}
