import { expect, test } from '@playwright/test';

import { cleanupJourney, connect, disconnect, seedListing, signUpBuyer } from './helpers';

/**
 * Sourcing recommendations. Uses the deterministic mock provider
 * (`AI_PROVIDER=mock`) and disables the geocoder (`GEOCODER_PROVIDER=off`), so
 * the run makes no live model or geocoding calls.
 *
 * What this verifies end to end — the things a human would otherwise have to
 * eyeball: the panel mounts, the endpoint returns ranked eligible suppliers,
 * the score breakdown and evidence render, the response is read-only, and the
 * fallback summary appears when there is no model explanation.
 */

const EMAIL = `sourcing-recs-e2e-${Date.now()}@example.com`;
const PASSWORD = 'GebeyaLink123!';
const SLUG = `recs-e2e-${Date.now()}`;

test.setTimeout(240_000);

let seeded: { cooperativeId: string; lotId: string; listingId: string };

test.beforeAll(async () => {
  await connect();
  // A large, cheap grade-A maize lot so it passes eligibility for a maize query.
  seeded = await seedListing({ slug: SLUG, location: 'Adama', totalKg: 8000, price: 42 });
});

test.afterAll(async () => {
  await cleanupJourney({ email: EMAIL, cooperativeId: seeded.cooperativeId, lotId: seeded.lotId, listingId: seeded.listingId });
  await disconnect();
});

async function signInBuyer(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  await signUpBuyer(request, EMAIL, PASSWORD);
  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/marketplace', { timeout: 120_000 });
}

test('buyer gets ranked, explainable supplier recommendations', async ({ page, request }) => {
  await signInBuyer(page, request);

  const heading = page.getByRole('heading', { name: 'Ranked, evidence-backed supplier matches' });
  await expect(heading).toBeVisible();

  await page.getByLabel('Describe what you are sourcing').fill('5 tonnes of grade A maize under 60');
  await page.getByRole('button', { name: 'Recommend suppliers' }).click();

  // The seeded cooperative must surface as an eligible recommendation with a
  // score breakdown and at least one evidence claim. Scope to the panel so the
  // listing grid's copy of the name does not cause a strict-mode clash.
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Ranked, evidence-backed supplier matches' }) });
  await expect(page.getByText('Assistant summary')).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByRole('heading', { name: 'E2E Coop ' + SLUG })).toBeVisible();
  await expect(panel.getByText('Quantity coverage').first()).toBeVisible();
  await expect(panel.getByText('Evidence', { exact: true }).first()).toBeVisible();

  // Read-only assurance is stated in the UI.
  await expect(page.getByText(/no stock is reserved until you place an order/i)).toBeVisible();
});
