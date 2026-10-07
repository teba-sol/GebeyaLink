import { expect, test } from '@playwright/test';

test('GET /api/v1/health reports ok', async ({ request }) => {
  const res = await request.get('/api/v1/health');

  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('no-store');

  const body = await res.json();
  expect(body.data.status).toBe('ok');
  expect(['up', 'down', 'unconfigured']).toContain(body.data.database);
});
