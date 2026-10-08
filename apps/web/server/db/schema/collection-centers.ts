import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { cooperatives } from './cooperatives';

/**
 * Collection centers (docs/prd.md §9; docs/business-domain-model.md §9).
 *
 * Admin-only create/update/deactivate; staff and collection agents view
 * centers within their cooperative membership scope. Soft deletes from day one.
 */
export const collectionCenters = pgTable(
  'collection_centers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    location: text('location'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('collection_centers_coop_name_unique').on(table.cooperativeId, table.name),
    index('collection_centers_cooperative_idx').on(table.cooperativeId),
  ],
);

export const collectionCentersRelations = relations(collectionCenters, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [collectionCenters.cooperativeId],
    references: [cooperatives.id],
  }),
}));