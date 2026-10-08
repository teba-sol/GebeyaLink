import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as CENTERS_GET, POST as CENTERS_POST } from '../app/api/v1/collection-centers/route';
import { GET as CENTER_GET, PATCH as CENTER_PATCH } from '../app/api/v1/collection-centers/[id]/route';
import { GET as DELIVERIES_GET, POST as DELIVERIES_POST } from '../app/api/v1/deliveries/route';
import { GET as DELIVERY_GET } from '../app/api/v1/deliveries/[id]/route';
import { GET as INVENTORY_GET } from '../app/api/v1/inventory/route';
import { GET as INVENTORY_ITEM_GET } from '../app/api/v1/inventory/[id]/route';
import { GET as PRODUCTS_GET } from '../app/api/v1/products/route';
import { db } from '../server/db';
import { user, userRoles } from '../server/db/schema';
import { account, session } from '../server/db/schema/auth';
import { collectionCenters } from '../server/db/schema/collection-centers';
import { cooperativeMembers, cooperatives } from '../server/db/schema/cooperatives';
import { farmers } from '../server/db/schema/farmers';
import { farmerDeliveries } from '../server/db/schema/farmer-deliveries';
import { inventoryLots, inventoryLotSources } from '../server/db/schema/inventory';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c3-${Date.now()}`;
const BASE_CENTERS = 'http://localhost/api/v1/collection-centers';
const BASE_DELIVERIES = 'http://localhost/api/v1/deliveries';
const BASE_INVENTORY = 'http://localhost/api/v1/inventory';
const BASE_PRODUCTS = 'http://localhost/api/v1/products';

const identities = {
  admin: { userId: '', email: `${EMAIL_TOKEN}-admin@example.test`, role: 'admin' as const },
  staff: {
    userId: '',
    email: `${EMAIL_TOKEN}-staff@example.test`,
    role: 'cooperative_staff' as const,
  },
  agent: {
    userId: '',
    email: `${EMAIL_TOKEN}-agent@example.test`,
    role: 'collection_agent' as const,
  },
  buyer: { userId: '', email: `${EMAIL_TOKEN}-buyer@example.test`, role: 'buyer' as const },
  none: { userId: '', email: `${EMAIL_TOKEN}-none@example.test`, role: null },
};

function sessionFor(key: keyof typeof identities): void {
  const identity = identities[key];
  mocks.getSession.mockResolvedValue({
    session: { id: `session-${identity.userId}` },
    user: { id: identity.userId, email: identity.email, name: 'C3 Test' },
  });
}

async function createCoop(name: string): Promise<string> {
  sessionFor('admin');
  const { POST: COOPS_POST } = await import('../app/api/v1/cooperatives/route');
  const req = new Request('http://localhost/api/v1/cooperatives', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const res = await COOPS_POST(req);
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.data.id as string;
}

async function createFarmerInline(
  sessionKey: keyof typeof identities,
  cooperativeId: string,
  overrides: Record<string, unknown> = {},
): Promise<any> {
  sessionFor(sessionKey);
  const req = new Request('http://localhost/api/v1/farmers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cooperativeId,
      name: `Co3 Farmer ${cooperativeId}`,
      ...overrides,
    }),
  });
  const { POST: FARMERS_POST } = await import('../app/api/v1/farmers/route');
  const res = await FARMERS_POST(req);
  const body = (await res.json()) as any;
  return { status: res.status, body };
}

async function addMembership(userId: string, cooperativeId: string): Promise<void> {
  await db.insert(cooperativeMembers).values({ cooperativeId, userId });
}

let coopAId: string;
let coopBId: string;
let centerAId: string;
let farmerAId: string;

describe('C3 - Collection & Inventory', () => {
  beforeAll(async () => {
    for (const identity of Object.values(identities)) {
      const [row] = await db
        .insert(user)
        .values({ name: 'C3 Test', email: identity.email, emailVerified: true })
        .returning({ id: user.id });
      identity.userId = row.id;
      if (identity.role) {
        await db.insert(userRoles).values({ userId: row.id, role: identity.role });
      }
    }

    coopAId = await createCoop('C3 Coop A');
    coopBId = await createCoop('C3 Coop B');
    await addMembership(identities.staff.userId, coopAId);
    await addMembership(identities.agent.userId, coopAId);

    sessionFor('admin');
    const cReq = new Request(BASE_CENTERS, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cooperativeId: coopAId, name: 'Main Center' }),
    });
    const cRes = await CENTERS_POST(cReq);
    expect(cRes.status).toBe(201);
    const cBody = await cRes.json();
    centerAId = cBody.data.id;

    const f = await createFarmerInline('admin', coopAId);
    expect(f.status).toBe(201);
    farmerAId = f.body.data.id;
  });

  afterAll(async () => {
    try {
      const uIds = [identities.admin.userId, identities.staff.userId, identities.agent.userId, identities.buyer.userId, identities.none.userId].filter(Boolean);
      if (uIds.length) {
        await db.delete(userRoles).where(inArray(userRoles.userId, uIds));
        await db.delete(session).where(inArray(session.userId, uIds));
        await db.delete(account).where(inArray(account.userId, uIds));
        await db.delete(user).where(inArray(user.id, uIds));
      }
    } catch {}
  });

  it('products: seeded catalog GET', async () => {
    sessionFor('staff');
    const res = await PRODUCTS_GET(new Request(BASE_PRODUCTS));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.map((p: any) => p.id)).toContain('maize');
  });

  it('collection centers: anon 401, buyer 403', async () => {
    mocks.getSession.mockResolvedValue(null);
    const r401 = await CENTERS_GET(new Request(BASE_CENTERS));
    expect(r401.status).toBe(401);
    sessionFor('buyer');
    const r403 = await CENTERS_GET(new Request(BASE_CENTERS));
    expect(r403.status).toBe(403);
  });

  it('staff cannot create center (403), admin can (201)', async () => {
    sessionFor('staff');
    const r403 = await CENTERS_POST(
      new Request(BASE_CENTERS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cooperativeId: coopAId, name: 'X' }),
      }),
    );
    expect(r403.status).toBe(403);
    sessionFor('admin');
    const r201 = await CENTERS_POST(
      new Request(BASE_CENTERS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cooperativeId: coopAId, name: 'West Center' }),
      }),
    );
    expect(r201.status).toBe(201);
  });

  it('duplicate center name in same coop → 409', async () => {
    sessionFor('admin');
    const r = await CENTERS_POST(
      new Request(BASE_CENTERS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cooperativeId: coopAId, name: 'Main Center' }),
      }),
    );
    expect(r.status).toBe(409);
  });

  it('accepted delivery creates lot + source', async () => {
    sessionFor('agent');
    const r = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: centerAId,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 1000,
          measuredQuantity: 950,
          acceptedQuantity: 950,
          rejectedQuantity: 0,
          qualityGrade: 'A',
        }),
      }),
    );
    expect(r.status).toBe(201);
    const lot = await db.query.inventoryLots.findFirst({
      where: (l, { eq, and }) => and(eq(l.cooperativeId, coopAId), eq(l.productId, 'maize')),
    });
    expect(lot?.totalQuantity).toBe(950);
    expect(lot?.availableQuantity).toBe(950);
  });

  it('aggregation: two accepted deliveries same combo → lot totals sum', async () => {
    sessionFor('agent');
    const r2 = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: centerAId,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 1000,
          measuredQuantity: 1000,
          acceptedQuantity: 1000,
          rejectedQuantity: 0,
          qualityGrade: 'A',
        }),
      }),
    );
    expect(r2.status).toBe(201);
    const lot = await db.query.inventoryLots.findFirst({
      where: (l, { eq, and }) =>
        and(eq(l.cooperativeId, coopAId), eq(l.productId, 'maize'), eq(l.qualityGrade, 'A')),
    });
    expect(lot?.totalQuantity).toBe(1950);
  });

  it('rejected delivery → no inventory created', async () => {
    sessionFor('agent');
    const r = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: centerAId,
          farmerId: farmerAId,
          productId: 'wheat',
          claimedQuantity: 500,
          measuredQuantity: 400,
          acceptedQuantity: 0,
          rejectedQuantity: 400,
          qualityGrade: 'REJECTED',
        }),
      }),
    );
    expect(r.status).toBe(201);
    const lot = await db.query.inventoryLots.findFirst({
      where: (l, { eq, and }) => and(eq(l.cooperativeId, coopAId), eq(l.productId, 'wheat')),
    });
    expect(lot).toBeUndefined();
  });

  it('different grade → separate lot', async () => {
    sessionFor('agent');
    const r = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: centerAId,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 500,
          measuredQuantity: 500,
          acceptedQuantity: 500,
          rejectedQuantity: 0,
          qualityGrade: 'B',
        }),
      }),
    );
    expect(r.status).toBe(201);
    const lots = await db.query.inventoryLots.findMany({
      where: (l, { eq, and }) => and(eq(l.cooperativeId, coopAId), eq(l.productId, 'maize')),
    });
    const grades = new Set(lots.map((l) => l.qualityGrade));
    expect(grades.has('A')).toBe(true);
    expect(grades.has('B')).toBe(true);
  });

  it('inactive center cannot receive accepted delivery', async () => {
    sessionFor('admin');
    const cRes = await CENTERS_POST(
      new Request(BASE_CENTERS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cooperativeId: coopAId, name: 'Temp Center' }),
      }),
    );
    const cid = (await cRes.json()).data.id;
    await CENTER_PATCH(
      new Request(`${BASE_CENTERS}/${cid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: false }),
      }),
      { params: Promise.resolve({ id: cid }) },
    );
    sessionFor('agent');
    const r = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: cid,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 100,
          measuredQuantity: 100,
          acceptedQuantity: 100,
          rejectedQuantity: 0,
          qualityGrade: 'A',
        }),
      }),
    );
    expect(r.status).toBe(403);
  });

  it('cross-coop farmer or center → 403', async () => {
    sessionFor('admin');
    const cRes = await CENTERS_POST(
      new Request(BASE_CENTERS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cooperativeId: coopBId, name: 'CB Center' }),
      }),
    );
    const cBid = (await cRes.json()).data.id;
    sessionFor('agent');
    const r1 = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: cBid,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 100,
          measuredQuantity: 100,
          acceptedQuantity: 100,
          rejectedQuantity: 0,
          qualityGrade: 'A',
        }),
      }),
    );
    expect(r1.status).toBe(403);
  });

  it('quantity validation: accepted > measured → 422', async () => {
    sessionFor('agent');
    const r = await DELIVERIES_POST(
      new Request(BASE_DELIVERIES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cooperativeId: coopAId,
          collectionCenterId: centerAId,
          farmerId: farmerAId,
          productId: 'maize',
          claimedQuantity: 100,
          measuredQuantity: 100,
          acceptedQuantity: 200,
          rejectedQuantity: 0,
          qualityGrade: 'A',
        }),
      }),
    );
    expect(r.status).toBe(422);
  });

  it('scoped lists: buyer cannot see inventory (403), agent sees (200)', async () => {
    sessionFor('buyer');
    const r403 = await INVENTORY_GET(new Request(BASE_INVENTORY));
    expect(r403.status).toBe(403);
    sessionFor('agent');
    const r200 = await INVENTORY_GET(new Request(BASE_INVENTORY));
    expect(r200.status).toBe(200);
  });

  it('lot detail includes sources lineage', async () => {
    const lots = await db.query.inventoryLots.findMany({
      where: (l, { eq, and }) => and(eq(l.cooperativeId, coopAId), eq(l.productId, 'maize')),
    });
    const lotA = lots.find((l) => l.qualityGrade === 'A');
    expect(lotA).toBeDefined();
    sessionFor('staff');
    const r = await INVENTORY_ITEM_GET(new Request(`${BASE_INVENTORY}/${lotA!.id}`), {
      params: Promise.resolve({ id: lotA!.id }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.data.sources)).toBe(true);
    expect(body.data.sources.length).toBeGreaterThan(0);
  });
});