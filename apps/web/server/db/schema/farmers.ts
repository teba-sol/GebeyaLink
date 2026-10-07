import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { cooperatives } from './cooperatives';

/**
 * Farmers — business records only, never platform users.
 * (docs/roles-and-permissions.md §3, §11; docs/prd.md §8.1; docs/business-domain-model.md §8)
 *
 * A farmer belongs to a cooperative and holds no authentication or platform role.
 * Soft deletes from day one; the C2 API deactivates via `active`, no DELETE route
 * (roles-and-permissions.md has no delete-farmer capability).
 */
export const farmers = pgTable(
  'farmers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    location: text('location'),
    active: boolean('active').notNull().default(true),
    registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('farmers_coop_phone_unique')
      .on(table.cooperativeId, table.phone)
      .where(sql`"phone" IS NOT NULL`),
    index('farmers_cooperative_idx').on(table.cooperativeId),
    index('farmers_deleted_at_idx').on(table.deletedAt),
  ],
);

export const farmersRelations = relations(farmers, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [farmers.cooperativeId],
    references: [cooperatives.id],
  }),
}));
