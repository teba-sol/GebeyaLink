import 'server-only';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { bearer } from 'better-auth/plugins';

import { db } from '../db';
import * as schema from '../db/schema';

/**
 * Single Better Auth instance for web (cookies, via nextCookies) and
 * mobile (Authorization: Bearer, via bearer plugin).
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [bearer(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
