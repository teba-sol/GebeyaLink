import { expect, test } from '@playwright/test';
import pg from 'pg';
import { loadEnv } from 'vite';

const env = loadEnv('test', process.cwd(), '');

for (const [key, value] of Object.entries(env)) {
  if (!(key in process.env)) process.env[key] = value;
}

let client: pg.Client | null = null;

test.beforeAll(async () => {
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
});

test.afterAll(async () => {
  await client?.end();
  client = null;
});

async function cleanupUser(email: string): Promise<void> {
  await client?.query('delete from "user" where email = $1', [email]);
}

test('cooperatives list requires authentication (401)', async ({ request }) => {
  const res = await request.get('/api/v1/cooperatives');
  expect(res.status()).toBe(401);
});

test('a signed-up user without a platform role is forbidden (403)', async ({ request }) => {
  const email = `c1-e2e-${Date.now()}@example.test`;
  const password = 'Passw0rd!C1';

  const signup = await request.post('/api/auth/sign-up/email', {
    data: { name: 'C1 E2E User', email, password },
  });
  expect(signup.ok()).toBeTruthy();

  const res = await request.get('/api/v1/cooperatives');
  expect(res.status()).toBe(403);

  await cleanupUser(email);
});
