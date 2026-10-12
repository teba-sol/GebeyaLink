import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as REGISTER_POST } from '../app/api/v1/registrations/route';
import { GET as VERIFICATIONS_GET } from '../app/api/v1/verifications/route';
import { PATCH as VERIFICATION_PATCH } from '../app/api/v1/verifications/[type]/[id]/route';
import { POST as COOPS_POST } from '../app/api/v1/cooperatives/route';
import { POST as CENTERS_POST } from '../app/api/v1/collection-centers/route';
import { POST as LISTINGS_POST } from '../app/api/v1/marketplace/listings/route';
import { POST as ORDERS_POST } from '../app/api/v1/orders/route';
import { db } from '../server/db';
import { account, session, user, userRoles } from '../server/db/schema';
import { buyers } from '../server/db/schema/buyers';
import { cooperativeMembers, cooperatives } from '../server/db/schema/cooperatives';
import { inventoryLots } from '../server/db/schema/inventory';
import { orders } from '../server/db/schema/orders';
import { auditEvents } from '../server/db/schema/payments';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c6-${Date.now()}`;
const BASE_REGISTRATIONS = 'http://localhost/api/v1/registrations';
const BASE_VERIFICATIONS = 'http://localhost/api/v1/verifications';
const BASE_COOPS = 'http://localhost/api/v1/cooperatives';
const BASE_CENTERS = 'http://localhost/api/v1/collection-centers';
const BASE_LISTINGS = 'http://localhost/api/v1/marketplace/listings';
const BASE_ORDERS = 'http://localhost/api/v1/orders';

const identities = {
  admin: { userId: '', email: `${EMAIL_TOKEN}-admin@example.test`, role: 'admin' as const },
  staff: {
    userId: '',
    email: `${EMAIL_TOKEN}-staff@example.test`,
    role: 'cooperative_staff' as const,
  },
  coopApplicant: { userId: '', email: `${EMAIL_TOKEN}-coop@example.test`, role: null },
  buyerApplicant: { userId: '', email: `${EMAIL_TOKEN}-buyer@example.test`, role: null },
  transporterApplicant: { userId: '', email: `${EMAIL_TOKEN}-trans@example.test`, role: null },
  unverifiedBuyer: {
    userId: '',
    email: `${EMAIL_TOKEN}-ubuyer@example.test`,
    role: 'buyer' as const,
  },
};

function sessionFor(key: keyof typeof identities): void {
  const identity = identities[key];
  mocks.getSession.mockResolvedValue({
    session: { id: `session-${identity.userId}` },
    user: { id: identity.userId, email: identity.email, name: 'C6 Test' },
  });
}

type Handler = (request: Request) => Promise<Response>;

function postJson(handler: Handler, url: string, payload: unknown): Promise<Response> {
  return handler(
    new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

function registerAs(key: keyof typeof identities, payload: unknown): Promise<Response> {
  sessionFor(key);
  return postJson(REGISTER_POST, BASE_REGISTRATIONS, payload);
}

function approveAs(key: keyof typeof identities, type: string, id: string, payload: unknown) {
  sessionFor(key);
  return VERIFICATION_PATCH(
    new Request(`${BASE_VERIFICATIONS}/${type}/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ type, id }) },
  );
}

describe('C6 - Organization verification + onboarding', () => {
  let pendingCoopId = '';
  let pendingBuyerId = '';
  const createdCoopIds: string[] = [];

  beforeAll(async () => {
    for (const identity of Object.values(identities)) {
      const [row] = await db
        .insert(user)
        .values({ name: 'C6 Test', email: identity.email, emailVerified: true })
        .returning({ id: user.id });
      identity.userId = row.id;
      if (identity.role) {
        await db.insert(userRoles).values({ userId: row.id, role: identity.role });
      }
    }
  });

  afterAll(async () => {
    try {
      const uIds = Object.values(identities).map((i) => i.userId).filter(Boolean);
      if (uIds.length) {
        await db.delete(auditEvents).where(inArray(auditEvents.actorId, uIds));
        await db.delete(buyers).where(inArray(buyers.userId, uIds));
        await db.delete(orders).where(inArray(orders.buyerId, uIds));
      }
      const coopIds = [pendingCoopId, ...createdCoopIds].filter(Boolean);
      if (coopIds.length) {
        await db.delete(cooperatives).where(inArray(cooperatives.id, coopIds));
      }
      if (uIds.length) {
        await db.delete(cooperativeMembers).where(inArray(cooperativeMembers.userId, uIds));
        await db.delete(userRoles).where(inArray(userRoles.userId, uIds));
        await db.delete(session).where(inArray(session.userId, uIds));
        await db.delete(account).where(inArray(account.userId, uIds));
        await db.delete(user).where(inArray(user.id, uIds));
      }
    } catch {
      // best-effort cleanup
    }
  });

  async function createApprovedCoop(name: string): Promise<string> {
    const res = await postJson(COOPS_POST, BASE_COOPS, { name });
    expect(res.status).toBe(201);
    const id = (await res.json()).data.id as string;
    createdCoopIds.push(id);
    return id;
  }

  it('registration authz: anon 401, role-holder 403, no-role 201 pending, duplicate 409', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await postJson(REGISTER_POST, BASE_REGISTRATIONS, { type: 'cooperative', name: 'Anon' })).status).toBe(401);

    const staffRes = await registerAs('staff', { type: 'cooperative', name: 'Staff Coop' });
    expect(staffRes.status).toBe(403);

    const res = await registerAs('coopApplicant', {
      type: 'cooperative',
      name: 'C6 Pending Coop',
      region: 'Oromia',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.verificationStatus).toBe('pending');
    expect(body.data.submittedByUserId).toBe(identities.coopApplicant.userId);
    pendingCoopId = body.data.id;

    const dup = await registerAs('coopApplicant', { type: 'cooperative', name: 'C6 Again' });
    expect(dup.status).toBe(409);
  });

  it('admin queue lists the pending registration; non-admin 403', async () => {
    sessionFor('staff');
    expect((await VERIFICATIONS_GET(new Request(BASE_VERIFICATIONS))).status).toBe(403);

    sessionFor('admin');
    const res = await VERIFICATIONS_GET(new Request(BASE_VERIFICATIONS));
    expect(res.status).toBe(200);
    const items = (await res.json()).data.items as Array<{ id: string; status: string }>;
    expect(items.some((i) => i.id === pendingCoopId && i.status === 'pending')).toBe(true);
  });

  it('approving a cooperative grants staff access and unlocks publishing', async () => {
    await db
      .insert(cooperativeMembers)
      .values({ cooperativeId: pendingCoopId, userId: identities.staff.userId, active: true });

    sessionFor('admin');
    const center = await postJson(CENTERS_POST, BASE_CENTERS, {
      cooperativeId: pendingCoopId,
      name: 'C6 Center',
      location: 'Adama',
    });
    expect(center.status).toBe(201);
    const centerId = (await center.json()).data.id as string;
    const [lot] = await db
      .insert(inventoryLots)
      .values({
        cooperativeId: pendingCoopId,
        collectionCenterId: centerId,
        productId: 'maize',
        qualityGrade: 'A',
        totalQuantity: 5000,
        availableQuantity: 5000,
      })
      .returning({ id: inventoryLots.id });

    sessionFor('staff');
    const blocked = await postJson(LISTINGS_POST, BASE_LISTINGS, {
      inventoryLotId: lot.id,
      pricePerUnit: 45,
    });
    expect(blocked.status).toBe(422);
    expect((await blocked.json()).error.code).toBe('cooperative_not_verified');

    const approve = await approveAs('admin', 'cooperative', pendingCoopId, { action: 'approve' });
    expect(approve.status).toBe(200);
    expect((await approve.json()).data.status).toBe('approved');

    const role = await db.query.userRoles.findFirst({
      where: (t, { eq }) => eq(t.userId, identities.coopApplicant.userId),
    });
    expect(role?.role).toBe('cooperative_staff');
    const membership = await db.query.cooperativeMembers.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.userId, identities.coopApplicant.userId),
          eq(t.cooperativeId, pendingCoopId),
          eq(t.active, true),
        ),
    });
    expect(membership).toBeDefined();

    sessionFor('coopApplicant');
    const unlocked = await postJson(LISTINGS_POST, BASE_LISTINGS, {
      inventoryLotId: lot.id,
      pricePerUnit: 45,
    });
    expect(unlocked.status).toBe(201);
  });

  it('reject requires a reason; reject then approve grants buyer role; re-approve 422', async () => {
    const res = await registerAs('buyerApplicant', {
      type: 'buyer',
      organizationName: 'C6 Buyer',
    });
    expect(res.status).toBe(201);
    pendingBuyerId = (await res.json()).data.id;

    const noNote = await approveAs('admin', 'buyer', pendingBuyerId, { action: 'reject' });
    expect(noNote.status).toBe(400);

    const reject = await approveAs('admin', 'buyer', pendingBuyerId, {
      action: 'reject',
      note: 'incomplete documents',
    });
    expect(reject.status).toBe(200);
    expect((await reject.json()).data.status).toBe('rejected');

    const approve = await approveAs('admin', 'buyer', pendingBuyerId, { action: 'approve' });
    expect(approve.status).toBe(200);

    const role = await db.query.userRoles.findFirst({
      where: (t, { eq }) => eq(t.userId, identities.buyerApplicant.userId),
    });
    expect(role?.role).toBe('buyer');
    const profile = await db.query.buyers.findFirst({
      where: (t, { eq }) => eq(t.userId, identities.buyerApplicant.userId),
    });
    expect(profile?.verificationStatus).toBe('approved');

    const again = await approveAs('admin', 'buyer', pendingBuyerId, { action: 'approve' });
    expect(again.status).toBe(422);
    expect((await again.json()).error.code).toBe('invalid_transition');
  });

  it('approving a transporter grants the transporter role', async () => {
    const res = await registerAs('transporterApplicant', {
      type: 'transporter',
      companyName: 'C6 Freight',
    });
    expect(res.status).toBe(201);
    const transporterId = (await res.json()).data.id as string;

    const approve = await approveAs('admin', 'transporter', transporterId, { action: 'approve' });
    expect(approve.status).toBe(200);

    const role = await db.query.userRoles.findFirst({
      where: (t, { eq }) => eq(t.userId, identities.transporterApplicant.userId),
    });
    expect(role?.role).toBe('transporter');
  });

  it('unverified buyer cannot order; approval unlocks it', async () => {
    sessionFor('admin');
    const coopId = await createApprovedCoop('C6 Selling Coop');
    const center = await postJson(CENTERS_POST, BASE_CENTERS, {
      cooperativeId: coopId,
      name: 'C6 Sell Center',
      location: 'Adama',
    });
    const centerId = (await center.json()).data.id as string;
    const [lot] = await db
      .insert(inventoryLots)
      .values({
        cooperativeId: coopId,
        collectionCenterId: centerId,
        productId: 'maize',
        qualityGrade: 'A',
        totalQuantity: 5000,
        availableQuantity: 5000,
      })
      .returning({ id: inventoryLots.id });

    const listed = await postJson(LISTINGS_POST, BASE_LISTINGS, {
      inventoryLotId: lot.id,
      pricePerUnit: 50,
    });
    expect(listed.status).toBe(201);
    const listingId = (await listed.json()).data.id as string;

    sessionFor('unverifiedBuyer');
    const blocked = await postJson(ORDERS_POST, BASE_ORDERS, { listingId, quantity: 1000 });
    expect(blocked.status).toBe(422);
    expect((await blocked.json()).error.code).toBe('buyer_not_verified');

    await db.insert(buyers).values({
      userId: identities.unverifiedBuyer.userId,
      organizationName: 'C6 Buyer',
      verificationStatus: 'approved',
    });

    sessionFor('unverifiedBuyer');
    const ok = await postJson(ORDERS_POST, BASE_ORDERS, { listingId, quantity: 1000 });
    expect(ok.status).toBe(201);
  });
});
