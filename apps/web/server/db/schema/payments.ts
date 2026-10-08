import { relations, sql } from 'drizzle-orm';
import { decimal, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PaymentStatus } from '@gebeyalink/types';

import { user } from './auth';
import { orders } from './orders';

/**
 * Payment records — C5 (docs/prd.md §23; docs/business-domain-model.md §30–§32).
 *
 * One row per buyer payment attempt. The buyer pays the cooperative
 * directly; GebeyaLink only records status (BR-016/BR-017). Amount must
 * equal the order's product total (BR-015: 100% before pickup). At most
 * one PENDING attempt exists per order; FAILED attempts are superseded by
 * a fresh buyer submission. CONFIRMED is terminal.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    buyerId: text('buyer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    status: text('status').$type<PaymentStatus>().notNull().default('PENDING'),
    method: text('method'),
    reference: text('reference'),
    notes: text('notes'),
    confirmedBy: text('confirmed_by').references(() => user.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_order_idx').on(table.orderId),
    uniqueIndex('payments_pending_order_unique')
      .on(table.orderId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

/**
 * Audit events — C5 (docs/prd.md §47).
 *
 * Append-only record of important order/payment state changes, written in
 * the same transaction as the change. Deliberately carries no foreign
 * keys: audit evidence must survive entity deletion.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    actorId: text('actor_id'),
    actorRole: text('actor_role'),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    orderId: uuid('order_id'),
    cooperativeId: uuid('cooperative_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_order_idx').on(table.orderId),
    index('audit_events_type_idx').on(table.eventType),
  ],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  buyer: one(user, { fields: [payments.buyerId], references: [user.id] }),
  confirmer: one(user, { fields: [payments.confirmedBy], references: [user.id] }),
}));
