import { relations } from 'drizzle-orm';
import {
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  DeliveryQualityGrade,
  OrderStatus,
  RejectionReason,
  ReservationStatus,
  ReservationReleaseReason,
} from '@gebeyalink/types';

import { cooperatives } from './cooperatives';
import { inventoryLots } from './inventory';
import { marketplaceListings } from './marketplace';
import { products } from './products';
import { user } from './auth';

/**
 * Buyer orders — C4 minimal core + C5 order response (docs/prd.md §17,
 * §19–§23; docs/business-domain-model.md §21–§28).
 *
 * One order belongs to exactly one cooperative and one inventory lot.
 * C4 implements placement, reservation, cancellation, and 24-hour expiry;
 * C5 adds cooperative acceptance/rejection and payment-linked statuses.
 * Price and quantity are snapshotted at placement and never change
 * (price lock, docs/prd.md §13.3 / BR-014).
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerId: text('buyer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'restrict' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: 'restrict' }),
    inventoryLotId: uuid('inventory_lot_id')
      .notNull()
      .references(() => inventoryLots.id, { onDelete: 'restrict' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    qualityGrade: text('quality_grade').$type<DeliveryQualityGrade>().notNull(),
    quantity: decimal('quantity', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 3, mode: 'number' }).notNull(),
    productTotal: decimal('product_total', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    status: text('status').$type<OrderStatus>().notNull().default('PENDING'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason').$type<RejectionReason>(),
    rejectionExplanation: text('rejection_explanation'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_buyer_idx').on(table.buyerId),
    index('orders_cooperative_idx').on(table.cooperativeId),
    index('orders_status_idx').on(table.status),
    index('orders_expires_at_idx').on(table.expiresAt),
  ],
);

/**
 * Inventory reservations — C4 (docs/prd.md §18; docs/business-domain-
 * model.md §24–§25).
 *
 * Exactly one active-or-released reservation per order. The reservation
 * mirrors quantity already moved between available_quantity and
 * reserved_quantity on the lot; it is the audit trail for why a lot's
 * available quantity shrank.
 */
export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => inventoryLots.id, { onDelete: 'restrict' }),
    buyerId: text('buyer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    quantity: decimal('quantity', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    status: text('status').$type<ReservationStatus>().notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releaseReason: text('release_reason').$type<ReservationReleaseReason>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('inventory_reservations_lot_idx').on(table.lotId),
    index('inventory_reservations_buyer_idx').on(table.buyerId),
    index('inventory_reservations_status_idx').on(table.status),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(user, { fields: [orders.buyerId], references: [user.id] }),
  cooperative: one(cooperatives, {
    fields: [orders.cooperativeId],
    references: [cooperatives.id],
  }),
  listing: one(marketplaceListings, {
    fields: [orders.listingId],
    references: [marketplaceListings.id],
  }),
  inventoryLot: one(inventoryLots, {
    fields: [orders.inventoryLotId],
    references: [inventoryLots.id],
  }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
  reservation: many(inventoryReservations),
}));

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  order: one(orders, { fields: [inventoryReservations.orderId], references: [orders.id] }),
  lot: one(inventoryLots, {
    fields: [inventoryReservations.lotId],
    references: [inventoryLots.id],
  }),
  buyer: one(user, { fields: [inventoryReservations.buyerId], references: [user.id] }),
}));
