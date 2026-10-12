import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { VerificationStatus } from '@gebeyalink/types';

import { user } from './auth';

/**
 * Buyer organizations (docs/prd.md §6.4, §7.2).
 *
 * One profile per buyer user. Only an approved profile may place orders
 * (enforced in the orders service). Soft-deleted like every org table.
 */
export const buyers = pgTable(
  'buyers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationName: text('organization_name').notNull(),
    businessType: text('business_type'),
    contactPerson: text('contact_person'),
    phone: text('phone'),
    email: text('email'),
    region: text('region'),
    zone: text('zone'),
    district: text('district'),
    address: text('address'),
    category: text('category'),
    verificationStatus: text('verification_status')
      .$type<VerificationStatus>()
      .notNull()
      .default('pending'),
    reviewNote: text('review_note'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('buyers_user_unique').on(table.userId),
    index('buyers_verification_status_idx').on(table.verificationStatus),
    index('buyers_deleted_at_idx').on(table.deletedAt),
  ],
);

export const buyersRelations = relations(buyers, ({ one }) => ({
  user: one(user, { fields: [buyers.userId], references: [user.id] }),
}));
