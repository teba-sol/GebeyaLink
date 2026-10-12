import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { VerificationStatus } from '@gebeyalink/types';

import { user } from './auth';

/**
 * Transporter organizations (docs/prd.md §6.5, §7.3).
 *
 * Records operator + vehicle information. Registration and admin approval
 * are captured now; the transporter login shell arrives with C6
 * (transportation/shipments).
 */
export const transporters = pgTable(
  'transporters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    region: text('region'),
    vehicleType: text('vehicle_type'),
    vehiclePlate: text('vehicle_plate'),
    capacity: text('capacity'),
    driverName: text('driver_name'),
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
    uniqueIndex('transporters_user_unique').on(table.userId),
    index('transporters_verification_status_idx').on(table.verificationStatus),
    index('transporters_deleted_at_idx').on(table.deletedAt),
  ],
);

export const transportersRelations = relations(transporters, ({ one }) => ({
  user: one(user, { fields: [transporters.userId], references: [user.id] }),
}));
