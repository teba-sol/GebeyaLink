import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { CooperativeStatus } from '@gebeyalink/types';

import { user } from './auth';

/**
 * Cooperatives and membership (docs/roles-and-permissions.md §5, §12).
 *
 * Soft deletes from day one (deletedAt). A member row links a platform user
 * to the cooperative they operate within; the platform role itself lives in
 * user_roles (single source of truth).
 */
export const cooperatives = pgTable(
  'cooperatives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status').$type<CooperativeStatus>().notNull().default('active'),
    phone: text('phone'),
    email: text('email'),
    region: text('region'),
    zone: text('zone'),
    district: text('district'),
    address: text('address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('cooperatives_slug_unique').on(table.slug),
    index('cooperatives_status_idx').on(table.status),
    index('cooperatives_deleted_at_idx').on(table.deletedAt),
  ],
);

export const cooperativeMembers = pgTable(
  'cooperative_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cooperativeId: uuid('cooperative_id')
      .notNull()
      .references(() => cooperatives.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('cooperative_members_coop_user_unique').on(table.cooperativeId, table.userId),
    index('cooperative_members_user_idx').on(table.userId),
    index('cooperative_members_active_idx').on(table.active),
  ],
);

export const cooperativesRelations = relations(cooperatives, ({ many }) => ({
  members: many(cooperativeMembers),
}));

export const cooperativeMembersRelations = relations(cooperativeMembers, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [cooperativeMembers.cooperativeId],
    references: [cooperatives.id],
  }),
  user: one(user, {
    fields: [cooperativeMembers.userId],
    references: [user.id],
  }),
}));
