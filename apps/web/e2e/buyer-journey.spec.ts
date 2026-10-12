import { expect, test } from '@playwright/test';

import {
  cleanupJourney,
  connect,
  disconnect,
  seedListing,
  signUpBuyer,
} from './helpers';

const RUN_ID = Date.now();
const email = `buyer-journey-${RUN_ID}@example.test`;
const password = 'CorrectHorse9!';
const slug = `bj-${RUN_ID}`;
const cooperativeName = 'E2E Coop ' + slug;

test.setTimeout(240_000);

let seeded: Awaited<ReturnType<typeof seedListing>>;

test.beforeAll(async ({ request }) => {
  await connect();
  await signUpBuyer(request, email, password);
  seeded = await seedListing({ slug });
});

test.afterAll(async () => {
  await cleanupJourney({
    email,
    cooperativeId: seeded.cooperativeId,
    lotId: seeded.lotId,
    listingId: seeded.listingId,
  });
  await disconnect();
});

test('buyer journey: sign in → browse → order → journey timeline', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL('**/marketplace', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Source Ethiopia’s finest commodities.' })).toBeVisible();
  await expect(page.getByText(cooperativeName)).toBeVisible();

  await page.goto(`/marketplace/${seeded.listingId}`);
  await expect(page.getByRole('heading', { name: 'Maize · Grade A' })).toBeVisible();
  await expect(page.getByText('5,000 kg', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reserve stock & order' })).toBeVisible();

  await page.getByRole('button', { name: 'Increase quantity by 500 kilograms' }).click();
  await expect(page.getByText('81,450 ETB').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reserve stock & order' }).click();
  await page.waitForURL('**/orders/*', { timeout: 30_000 });

  const journey = page.locator('main');
  await expect(page.getByText('Cooperative response window')).toBeVisible();
  await expect(page.getByText('Order placed')).toBeVisible();
  await expect(page.getByText('Cooperative acceptance')).toBeVisible();
  await expect(page.getByText('Payment submitted')).toBeVisible();
  await expect(page.getByText('Pickup & delivery')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible();
  expect((await journey.innerText()).toLowerCase()).toContain('pending');

  await page.goto('/orders');
  await expect(page.getByText('Open journey →')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
});