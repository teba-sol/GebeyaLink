import { type APIRequestContext } from '@playwright/test';
import pg from 'pg';
import { loadEnv } from 'vite';

const env = loadEnv('test', process.cwd(), '');

for (const [key, value] of Object.entries(env)) {
  if (!(key in process.env)) process.env[key] = value;
}

export let client: pg.Client | null = null;

export async function connect(): Promise<void> {
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
}

export async function disconnect(): Promise<void> {
  await client?.end();
  client = null;
}

export async function signUpBuyer(request: APIRequestContext, email: string, password: string) {
  const signup = await request.post('/api/auth/sign-up/email', {
    data: { name: 'Buyer Journey E2E', email, password },
  });
  if (!signup.ok()) {
    throw new Error(`sign-up failed: ${signup.status()} ${await signup.text()}`);
  }
  const { rows } = await client!.query<{ id: string }>('select id from "user" where email = $1', [email]);
  const userId = rows[0].id;
  await client!.query('insert into user_roles (user_id, role) values ($1, $2)', [userId, 'buyer']);
  return { userId, email, password };
}

/**
 * Seeds one fully wired marketplace listing (cooperative → collection
 * center → inventory lot → listing) so the journey runs against a
 * controlled, removable lot rather than shared production data.
 */
export async function seedListing(opts: { slug: string; location?: string; totalKg?: number; price?: number }) {
  const slug = opts.slug;
  const location = opts.location ?? 'E2E City';
  const totalKg = opts.totalKg ?? 5000;
  const price = opts.price ?? 54.3;

  const coop = await client!.query<{ id: string }>(
    `insert into cooperatives (name, slug, status) values ($1, $2, 'active') returning id`,
    ['E2E Coop ' + slug, slug],
  );
  const cooperativeId = coop.rows[0].id;

  const center = await client!.query<{ id: string }>(
    `insert into collection_centers (cooperative_id, name, location) values ($1, 'E2E Center', $2) returning id`,
    [cooperativeId, location],
  );
  const centerId = center.rows[0].id;

  const lot = await client!.query<{ id: string }>(
    `insert into inventory_lots (cooperative_id, collection_center_id, product_id, quality_grade, total_quantity, available_quantity, reserved_quantity, status)
     values ($1, $2, 'maize', 'A', $3, $3, 0, 'AVAILABLE') returning id`,
    [cooperativeId, centerId, totalKg],
  );
  const lotId = lot.rows[0].id;

  const listing = await client!.query<{ id: string }>(
    `insert into marketplace_listings (cooperative_id, inventory_lot_id, price_per_unit, status)
     values ($1, $2, $3, 'active') returning id`,
    [cooperativeId, lotId, price],
  );
  const listingId = listing.rows[0].id;

  return { cooperativeId, centerId, lotId, listingId, slug };
}

/** Deletes the buyer (orders/reservations/payments cascade off the user), then the seeded chain. */
export async function cleanupJourney(opts: { email: string; cooperativeId: string; lotId: string; listingId: string }) {
  await client!.query('delete from "user" where email = $1', [opts.email]);
  await client!.query('delete from marketplace_listings where id = $1', [opts.listingId]);
  await client!.query('delete from inventory_lots where id = $1', [opts.lotId]);
  await client!.query('delete from cooperatives where id = $1', [opts.cooperativeId]);
}