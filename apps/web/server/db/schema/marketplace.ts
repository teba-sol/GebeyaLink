import { relations } from 'drizzle-orm';
import {
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ListingStatus } from '@gebeyalink/types';

import { cooperatives } from './cooperatives';
import { inventoryLots } from './inventory';

/**
 * Marketplace listings (docs/prd.md §16; docs/business-domain-model.md §18).
 *
 * A listing publishes exactly one C3 inventory lot. It stores only the
 * cooperative's asking price and lifecycle status — product, grade,
 * collection center, and quantities are always read live from the lot, so
 * no second inventory system exists. One lot may have at most one listing.
 */
export const marketplaceListings = pgTable(
  'marketplace_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    inventoryLotId: uuid('inventory_lot_id')
      .notNull()
      .references(() => inventoryLots.id, { onDelete: 'cascade' }),
    pricePerUnit: decimal('price_per_unit', { precision: 12, scale: 3, mode: 'number' }).notNull(),
    status: text('status').$type<ListingStatus>().notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('marketplace_listings_lot_unique').on(table.inventoryLotId),
    index('marketplace_listings_cooperative_idx').on(table.cooperativeId),
    index('marketplace_listings_status_idx').on(table.status),
  ],
);

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [marketplaceListings.cooperativeId],
    references: [cooperatives.id],
  }),
  inventoryLot: one(inventoryLots, {
    fields: [marketplaceListings.inventoryLotId],
    references: [inventoryLots.id],
  }),
}));
