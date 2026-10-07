import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Better Auth core schema (user, session, account, verification).
 *
 * Field-for-field against Better Auth 1.7.x core definitions
 * (@better-auth/core/dist/db/schema). Do not add business columns here —
 * domain tables live in their own files when those features are built.
 *
 * Ids are `text`: Better Auth generates 32-char hex ids, not RFC UUIDs.
 * The default generates a UUID when the client omits the id.
 */

const id = () =>
  text('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey();
const createdAt = () => timestamp('createdAt', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow();

export const user = pgTable(
  'user',
  {
    id: id(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)],
);

export const session = pgTable(
  'session',
  {
    id: id(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_idx').on(table.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    id: id(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    providerId: text('providerId').notNull(),
    accountId: text('accountId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
    index('account_user_idx').on(table.userId),
  ],
);

export const verification = pgTable(
  'verification',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
