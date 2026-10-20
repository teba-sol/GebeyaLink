import { expect, test } from '@playwright/test';

import { client, connect, disconnect, signUpBuyer } from './helpers';

/**
 * AI buyer sourcing search. Runs against the deterministic mock provider
 * (`AI_PROVIDER=mock`) — no live model/network calls. The AI extracts
 * criteria and the existing marketplace search renders the results.
 */

const EMAIL = `ai-sourcing-e2e-${Date.now()}@example.com`;
const PASSWORD = 'GebeyaLink123!';

test.setTimeout(240_000);

test.beforeAll(async () => {
  await connect();
});

test.afterAll(async () => {
  await client!.query('delete from "user" where email = $1', [EMAIL]);
  await disconnect();
});

test('buyer turns a plain-language request into applied search filters', async ({ page, request }) => {
  await signUpBuyer(request, EMAIL, PASSWORD);

  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/marketplace', { timeout: 120_000 });

  await page
    .getByLabel('Describe the commodity you are sourcing')
    .fill('5 tonnes of grade A coffee from Sidama under 300');
  await page.getByRole('button', { name: 'Find matches' }).click();

  await page.waitForURL('**/marketplace?**', { timeout: 120_000 });
  expect(page.url()).toContain('productId=coffee');
  expect(page.url()).toContain('qualityGrade=A');
  expect(page.url()).toContain('minAvailable=5000');

  const criteria = page.getByLabel('Extracted search criteria');
  await expect(criteria).toContainText('Coffee');
  await expect(criteria).toContainText('Grade A');
  await expect(criteria).toContainText('Sidama');
  await expect(criteria).toContainText('5,000 kg');
});
