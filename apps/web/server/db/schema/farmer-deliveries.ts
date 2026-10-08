import { relations } from 'drizzle-orm';
import { decimal, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { DeliveryQualityGrade, DeliveryStatus } from '@gebeyalink/types';

import { user } from './auth';
import { collectionCenters } from './collection-centers';
import { cooperatives } from './cooperatives';
import { farmers } from './farmers';
import { products } from './products';

/**
 * Farmer deliveries (docs/prd.md §8.2–8.3; docs/business-domain-model.md §13–14).
 *
 * A delivery is an immutable business-event record (PRD §3.5 traceability) —
 * intentionally no soft-delete. C3 records one validated snapshot per
 * submission with a final state of ACCEPTED or REJECTED; the full lifecycle
 * enum is preserved for future step transitions.
 *
 * A delivery never equals inventory: only accepted quantity becomes a lot.
 */
export const farmerDeliveries = pgTable(
  'farmer_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    collectionCenterId: uuid('collection_center_id')
      .notNull()
      .references(() => collectionCenters.id, { onDelete: 'cascade' }),
    farmerId: uuid('farmer_id')
      .notNull()
      .references(() => farmers.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    recordedById: text('recorded_by_id').references(() => user.id, { onDelete: 'set null' }),
    claimedQuantity: decimal('claimed_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull(),
    measuredQuantity: decimal('measured_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull(),
    acceptedQuantity: decimal('accepted_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull(),
    rejectedQuantity: decimal('rejected_quantity', { precision: 14, scale: 3, mode: 'number' })
      .notNull(),
    qualityGrade: text('quality_grade').$type<DeliveryQualityGrade>().notNull(),
    status: text('status').$type<DeliveryStatus>().notNull().default('RECEIVED'),
    deliveryDate: timestamp('delivery_date', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('farmer_deliveries_cooperative_idx').on(table.cooperativeId),
    index('farmer_deliveries_center_idx').on(table.collectionCenterId),
    index('farmer_deliveries_farmer_idx').on(table.farmerId),
    index('farmer_deliveries_product_idx').on(table.productId),
    index('farmer_deliveries_status_idx').on(table.status),
    index('farmer_deliveries_recorded_by_idx').on(table.recordedById),
  ],
);

export const farmerDeliveriesRelations = relations(farmerDeliveries, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [farmerDeliveries.cooperativeId],
    references: [cooperatives.id],
  }),
  collectionCenter: one(collectionCenters, {
    fields: [farmerDeliveries.collectionCenterId],
    references: [collectionCenters.id],
  }),
  farmer: one(farmers, {
    fields: [farmerDeliveries.farmerId],
    references: [farmers.id],
  }),
  product: one(products, {
    fields: [farmerDeliveries.productId],
    references: [products.id],
  }),
  recordedBy: one(user, {
    fields: [farmerDeliveries.recordedById],
    references: [user.id],
  }),
}));