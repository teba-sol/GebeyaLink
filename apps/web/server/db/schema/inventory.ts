import { relations } from 'drizzle-orm';
import { decimal, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { DeliveryQualityGrade, InventoryStatus } from '@gebeyalink/types';

import { collectionCenters } from './collection-centers';
import { cooperatives } from './cooperatives';
import { farmerDeliveries } from './farmer-deliveries';
import { products } from './products';

/**
 * Inventory lots (docs/prd.md §12; docs/business-domain-model.md §15–17).
 *
 * One aggregated lot per (cooperative, product, quality grade, collection
 * center). Accepted farmer deliveries add to the lot and remain traceable
 * through inventory_lot_sources. A delivery never creates inventory on its
 * own — only acceptance does. C4 adds reserved_quantity alongside
 * available_quantity; available + reserved never exceeds total (docs/
 * business-domain-model.md §16).
 */
export const inventoryLots = pgTable(
  'inventory_lots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    collectionCenterId: uuid('collection_center_id')
      .notNull()
      .references(() => collectionCenters.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    qualityGrade: text('quality_grade').$type<DeliveryQualityGrade>().notNull(),
    totalQuantity: decimal('total_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull()
      .default(0),
    availableQuantity: decimal('available_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull()
      .default(0),
    reservedQuantity: decimal('reserved_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull()
      .default(0),
    status: text('status').$type<InventoryStatus>().notNull().default('AVAILABLE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('inventory_lots_identity_unique').on(
      table.cooperativeId,
      table.productId,
      table.qualityGrade,
      table.collectionCenterId,
    ),
    index('inventory_lots_cooperative_idx').on(table.cooperativeId),
    index('inventory_lots_product_idx').on(table.productId),
  ],
);

/** Delivery-level source lineage for each lot (PRD §8.3 traceability). */
export const inventoryLotSources = pgTable(
  'inventory_lot_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => inventoryLots.id, { onDelete: 'cascade' }),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => farmerDeliveries.id, { onDelete: 'cascade' }),
    acceptedQuantity: decimal('accepted_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('inventory_lot_sources_lot_delivery_unique').on(table.lotId, table.deliveryId),
    index('inventory_lot_sources_delivery_idx').on(table.deliveryId),
  ],
);

export const inventoryLotsRelations = relations(inventoryLots, ({ one, many }) => ({
  cooperative: one(cooperatives, {
    fields: [inventoryLots.cooperativeId],
    references: [cooperatives.id],
  }),
  collectionCenter: one(collectionCenters, {
    fields: [inventoryLots.collectionCenterId],
    references: [collectionCenters.id],
  }),
  product: one(products, {
    fields: [inventoryLots.productId],
    references: [products.id],
  }),
  sources: many(inventoryLotSources),
}));

export const inventoryLotSourcesRelations = relations(inventoryLotSources, ({ one }) => ({
  lot: one(inventoryLots, {
    fields: [inventoryLotSources.lotId],
    references: [inventoryLots.id],
  }),
  delivery: one(farmerDeliveries, {
    fields: [inventoryLotSources.deliveryId],
    references: [farmerDeliveries.id],
  }),
}));