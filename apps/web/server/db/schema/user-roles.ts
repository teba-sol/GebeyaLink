import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PlatformRole } from '@gebeyalink/types';

import { user } from './auth';

/**
 * Platform role assignments (docs/roles-and-permissions.md §2).
 *
 * One active platform role per user. Role assignment is not exposed as an
 * API in C1; guards only read this table. Farmer is never a platform user.
 */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<PlatformRole>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_roles_user_unique').on(table.userId),
    index('user_roles_role_idx').on(table.role),
  ],
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
}));
