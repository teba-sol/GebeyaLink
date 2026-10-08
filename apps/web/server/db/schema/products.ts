import { boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Products — global reference catalog, not owned by cooperatives
 * (docs/prd.md §10; docs/business-domain-model.md §11).
 *
 * Seeded from the documented example commodities. GET-only in C3; admin
 * catalog management is deferred until business rules define it.
 */
export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('products_slug_unique').on(table.slug)],
);