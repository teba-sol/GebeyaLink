import { and, eq, inArray, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as LISTINGS_GET, POST as LISTINGS_POST } from '../app/api/v1/marketplace/listings/route';
import {
  GET as LISTING_GET,
  PATCH as LISTING_PATCH,
} from '../app/api/v1/marketplace/listings/[id]/route';
import { GET as ORDERS_GET, POST as ORDERS_POST } from '../app/api/v1/orders/route';
import { GET as ORDER_GET } from '../app/api/v1/orders/[id]/route';
import { POST as ORDER_CANCEL_POST } from '../app/api/v1/orders/[id]/cancel/route';
import { POST as COOPS_POST } from '../app/api/v1/cooperatives/route';
import { PATCH as COOP_PATCH } from '../app/api/v1/cooperatives/[id]/route';
import { POST as CENTERS_POST } from '../app/api/v1/collection-centers/route';
import { POST as DELIVERIES_POST } from '../app/api/v1/deliveries/route';
import { POST as FARMERS_POST } from '../app/api/v1/farmers/route';
import { db } from '../server/db';
import { account, session, user, userRoles } from '../server/db/schema';
import { buyers } from '../server/db/schema/buyers';
import { cooperativeMembers } from '../server/db/schema/cooperatives';
import { inventoryLots } from '../server/db/schema/inventory';
import { inventoryReservations, orders } from '../server/db/schema/orders';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c4-${Date.now()}`;
const BASE_LISTINGS = 'http://localhost/api/v1/marketplace/listings';
const BASE_ORDERS = 'http://localhost/api/v1/orders';
const BASE_CENTERS = 'http://localhost/api/v1/collection-centers';
const BASE_DELIVERIES = 'http://localhost/api/v1/deliveries';
const BASE_COOPS = 'http://localhost/api/v1/cooperatives';

const identities = {
  admin: { userId: '', email: `${EMAIL_TOKEN}-admin@example.test`, role: 'admin' as const },
  staffA: {
    userId: '',
    email: `${EMAIL_TOKEN}-staff-a@example.test`,
    role: 'cooperative_staff' as const,
  },
  staffB: {
    userId: '',
    email: `${EMAIL_TOKEN}-staff-b@example.test`,
    role: 'cooperative_staff' as const,
  },
  buyer1: { userId: '', email: `${EMAIL_TOKEN}-buyer1@example.test`, role: 'buyer' as const },
  buyer2: { userId: '', email: `${EMAIL_TOKEN}-buyer2@example.test`, role: 'buyer' as const },
  transporter: {
    userId: '',
    email: `${EMAIL_TOKEN}-transporter@example.test`,
    role: 'transporter' as const,
  },
  none: { userId: '', email: `${EMAIL_TOKEN}-none@example.test`, role: null },
};

function sessionFor(key: keyof typeof identities): void {
  const identity = identities[key];
  mocks.getSession.mockResolvedValue({
    session: { id: `session-${identity.userId}` },
    user: { id: identity.userId, email: identity.email, name: 'C4 Test' },
  });
}

async function createCoop(name: string): Promise<string> {
  sessionFor('admin');
  const res = await COOPS_POST(new Request(BASE_COOPS, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  }));
  expect(res.status).toBe(201);
  return (await res.json()).data.id as string;
}

async function addMembership(userId: string, cooperativeId: string): Promise<void> {
  await db.insert(cooperativeMembers).values({ cooperativeId, userId, active: true });
}

async function postJson(url: string, handler: (req: Request) => Promise<Response>, payload: unknown) {
  return handler(
    new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

async function acceptedDelivery(opts: {
  cooperativeId: string;
  collectionCenterId: string;
  farmerId: string;
  productId: string;
  quantity: number;
  qualityGrade: 'A' | 'B' | 'C';
}): Promise<void> {
  sessionFor('admin');
  const res = await postJson(BASE_DELIVERIES, DELIVERIES_POST, {
    cooperativeId: opts.cooperativeId,
    collectionCenterId: opts.collectionCenterId,
    farmerId: opts.farmerId,
    productId: opts.productId,
    claimedQuantity: opts.quantity,
    measuredQuantity: opts.quantity,
    acceptedQuantity: opts.quantity,
    rejectedQuantity: 0,
    qualityGrade: opts.qualityGrade,
  });
  expect(res.status).toBe(201);
}

async function findLot(cooperativeId: string, productId: string, grade: string) {
  return db.query.inventoryLots.findFirst({
    where: and(
      eq(inventoryLots.cooperativeId, cooperativeId),
      eq(inventoryLots.productId, productId),
      eq(inventoryLots.qualityGrade, grade as 'A' | 'B' | 'C'),
      isNull(inventoryLots.deletedAt),
    ),
  });
}

let coopAId: string;
let coopBId: string;
let centerAId: string;
let centerBId: string;
let farmerAId: string;
let farmerBId: string;
let lotAId: string;
let lotBId: string;
let lotCId: string;
let listingAId: string;
let listingBId: string;
let listingCId: string;
let order1Id: string;
let order2Id: string;

describe('C4 - Marketplace Core', () => {
  beforeAll(async () => {
    for (const identity of Object.values(identities)) {
      const [row] = await db
        .insert(user)
        .values({ name: 'C4 Test', email: identity.email, emailVerified: true })
        .returning({ id: user.id });
      identity.userId = row.id;
      if (identity.role) {
        await db.insert(userRoles).values({ userId: row.id, role: identity.role });
      }
    }

    // Approved buyer profiles (docs/prd.md §7.2): only verified buyers may order.
    for (const buyer of [identities.buyer1, identities.buyer2]) {
      await db
        .insert(buyers)
        .values({ userId: buyer.userId, organizationName: 'C4 Buyer', verificationStatus: 'approved' });
    }

    coopAId = await createCoop('C4 Coop A');
    coopBId = await createCoop('C4 Coop B');
    await addMembership(identities.staffA.userId, coopAId);
    await addMembership(identities.staffB.userId, coopBId);

    sessionFor('admin');
    const centerA = await postJson(BASE_CENTERS, CENTERS_POST, {
      cooperativeId: coopAId,
      name: 'C4 Center A',
      location: 'Adama',
    });
    expect(centerA.status).toBe(201);
    centerAId = (await centerA.json()).data.id;

    const centerB = await postJson(BASE_CENTERS, CENTERS_POST, {
      cooperativeId: coopBId,
      name: 'C4 Center B',
      location: 'Bahir Dar',
    });
    expect(centerB.status).toBe(201);
    centerBId = (await centerB.json()).data.id;

    const farmerA = await postJson('http://localhost/api/v1/farmers', FARMERS_POST, {
      cooperativeId: coopAId,
      name: 'C4 Farmer A',
    });
    expect(farmerA.status).toBe(201);
    farmerAId = (await farmerA.json()).data.id;

    const farmerB = await postJson('http://localhost/api/v1/farmers', FARMERS_POST, {
      cooperativeId: coopBId,
      name: 'C4 Farmer B',
    });
    expect(farmerB.status).toBe(201);
    farmerBId = (await farmerB.json()).data.id;

    // Cooperative A inventory: maize A 5,000 kg + maize B 500 kg.
    await acceptedDelivery({
      cooperativeId: coopAId,
      collectionCenterId: centerAId,
      farmerId: farmerAId,
      productId: 'maize',
      quantity: 5000,
      qualityGrade: 'A',
    });
    await acceptedDelivery({
      cooperativeId: coopAId,
      collectionCenterId: centerAId,
      farmerId: farmerAId,
      productId: 'maize',
      quantity: 500,
      qualityGrade: 'B',
    });
    // Cooperative B inventory: maize A 3,000 kg.
    await acceptedDelivery({
      cooperativeId: coopBId,
      collectionCenterId: centerBId,
      farmerId: farmerBId,
      productId: 'maize',
      quantity: 3000,
      qualityGrade: 'A',
    });

    const lotA = await findLot(coopAId, 'maize', 'A');
    const lotC = await findLot(coopAId, 'maize', 'B');
    const lotB = await findLot(coopBId, 'maize', 'A');
    expect(lotA, 'lotA (maize A, coopA)').toBeDefined();
    expect(lotB, 'lotB (maize A, coopB)').toBeDefined();
    expect(lotC, 'lotC (maize B, coopA)').toBeDefined();
    lotAId = lotA!.id;
    lotBId = lotB!.id;
    lotCId = lotC!.id;

    sessionFor('staffA');
    const lA = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotAId,
      pricePerUnit: 45,
    });
    expect(lA.status).toBe(201);
    listingAId = (await lA.json()).data.id;

    sessionFor('staffB');
    const lB = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotBId,
      pricePerUnit: 50,
    });
    expect(lB.status).toBe(201);
    listingBId = (await lB.json()).data.id;
  });

  afterAll(async () => {
    try {
      const uIds = Object.values(identities)
        .map((i) => i.userId)
        .filter(Boolean);
      if (uIds.length) {
        await db.delete(orders).where(inArray(orders.buyerId, uIds));
        await db.delete(userRoles).where(inArray(userRoles.userId, uIds));
        await db.delete(cooperativeMembers).where(inArray(cooperativeMembers.userId, uIds));
        await db.delete(session).where(inArray(session.userId, uIds));
        await db.delete(account).where(inArray(account.userId, uIds));
        await db.delete(user).where(inArray(user.id, uIds));
      }
    } catch {
      // best-effort cleanup
    }
  });

  it('browse authz: anon 401, transporter 403, no-role 403, buyer 200', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await LISTINGS_GET(new Request(BASE_LISTINGS))).status).toBe(401);
    sessionFor('transporter');
    expect((await LISTINGS_GET(new Request(BASE_LISTINGS))).status).toBe(403);
    sessionFor('none');
    expect((await LISTINGS_GET(new Request(BASE_LISTINGS))).status).toBe(403);
    sessionFor('buyer1');
    const ok = await LISTINGS_GET(new Request(BASE_LISTINGS));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    const ids = body.data.items.map((l: { id: string }) => l.id);
    expect(ids).toContain(listingAId);
    expect(ids).toContain(listingBId);
  });

  it('publish authz: buyer 403, cross-coop staff 403, member staff 201, duplicate 409', async () => {
    sessionFor('buyer1');
    const rBuyer = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotCId,
      pricePerUnit: 40,
    });
    expect(rBuyer.status).toBe(403);

    sessionFor('staffB');
    const rCross = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotCId,
      pricePerUnit: 40,
    });
    expect(rCross.status).toBe(403);

    sessionFor('staffA');
    const rOk = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotCId,
      pricePerUnit: 40,
    });
    expect(rOk.status).toBe(201);
    listingCId = (await rOk.json()).data.id;

    const rDup = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotCId,
      pricePerUnit: 41,
    });
    expect(rDup.status).toBe(409);
  });

  it('listing detail: cooperative/price/quantity present, no farmer data', async () => {
    sessionFor('buyer1');
    const res = await LISTING_GET(new Request(`${BASE_LISTINGS}/${listingAId}`), {
      params: Promise.resolve({ id: listingAId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.cooperativeName).toBe('C4 Coop A');
    expect(body.data.productId).toBe('maize');
    expect(body.data.qualityGrade).toBe('A');
    expect(body.data.availableQuantity).toBe(5000);
    expect(body.data.pricePerUnit).toBe(45);
    expect(body.data.minOrderQuantity).toBe(1000);
    expect(body.data.location).toBe('Adama');
    const raw = JSON.stringify(body.data);
    expect(raw).not.toContain('farmer');
    expect(raw).not.toContain('sources');
    expect(raw).not.toContain('delivery');
  });

  it('update listing: member staff 200, cross-coop 403, buyer 403, bad price 400', async () => {
    sessionFor('staffB');
    const rCross = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingAId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit: 1 }),
      }),
      { params: Promise.resolve({ id: listingAId }) },
    );
    expect(rCross.status).toBe(403);

    sessionFor('buyer1');
    const rBuyer = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingAId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit: 1 }),
      }),
      { params: Promise.resolve({ id: listingAId }) },
    );
    expect(rBuyer.status).toBe(403);

    sessionFor('staffA');
    const rBad = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingAId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit: -5 }),
      }),
      { params: Promise.resolve({ id: listingAId }) },
    );
    expect(rBad.status).toBe(400);

    const rOk = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingAId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit: 46 }),
      }),
      { params: Promise.resolve({ id: listingAId }) },
    );
    expect(rOk.status).toBe(200);
    expect((await rOk.json()).data.pricePerUnit).toBe(46);

    const rBack = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingAId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit: 45 }),
      }),
      { params: Promise.resolve({ id: listingAId }) },
    );
    expect(rBack.status).toBe(200);
  });

  it('browse filters: product, grade, price, availability, location', async () => {
    sessionFor('buyer1');
    const mine = new Set([listingAId, listingBId, listingCId]);
    const scoped = (body: { data: { items: Array<{ id: string }> } }) =>
      body.data.items.map((l) => l.id).filter((id) => mine.has(id));

    const byGrade = await LISTINGS_GET(
      new Request(`${BASE_LISTINGS}?productId=maize&qualityGrade=B`),
    );
    expect(byGrade.status).toBe(200);
    let body = await byGrade.json();
    expect(scoped(body)).toEqual([listingCId]);

    const byPrice = await LISTINGS_GET(new Request(`${BASE_LISTINGS}?maxPrice=44`));
    expect(byPrice.status).toBe(200);
    body = await byPrice.json();
    expect(scoped(body)).toEqual([listingCId]);

    const byAvail = await LISTINGS_GET(new Request(`${BASE_LISTINGS}?minAvailable=4000`));
    expect(byAvail.status).toBe(200);
    body = await byAvail.json();
    expect(scoped(body)).toEqual([listingAId]);

    const byLocation = await LISTINGS_GET(new Request(`${BASE_LISTINGS}?location=Bahir`));
    expect(byLocation.status).toBe(200);
    body = await byLocation.json();
    expect(scoped(body)).toEqual([listingBId]);

    const byProduct = await LISTINGS_GET(new Request(`${BASE_LISTINGS}?productId=wheat`));
    expect(byProduct.status).toBe(200);
    body = await byProduct.json();
    expect(scoped(body)).toEqual([]);
  });

  it('staff browse is scoped to own cooperative', async () => {
    sessionFor('staffB');
    const body = await (await LISTINGS_GET(new Request(BASE_LISTINGS))).json();
    const ids = body.data.items.map((l: { id: string }) => l.id);
    expect(ids).toEqual([listingBId]);
  });

  it('inactive cooperative hides its listings from buyers', async () => {
    sessionFor('admin');
    const pause = await COOP_PATCH(
      new Request(`${BASE_COOPS}/${coopBId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      }),
      { params: Promise.resolve({ id: coopBId }) },
    );
    expect(pause.status).toBe(200);

    sessionFor('buyer1');
    const body = await (await LISTINGS_GET(new Request(BASE_LISTINGS))).json();
    const ids = body.data.items.map((l: { id: string }) => l.id);
    expect(ids).not.toContain(listingBId);
    expect(ids).toContain(listingAId);

    sessionFor('admin');
    await COOP_PATCH(
      new Request(`${BASE_COOPS}/${coopBId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: coopBId }) },
    );
  });

  it('place order: reserves inventory and snapshots price', async () => {
    sessionFor('buyer1');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 3000,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    order1Id = body.data.id;
    expect(body.data.status).toBe('PENDING');
    expect(body.data.unitPrice).toBe(45);
    expect(body.data.productTotal).toBe(135000);
    expect(body.data.buyerId).toBe(identities.buyer1.userId);
    expect(new Date(body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
    expect(lot!.availableQuantity + lot!.reservedQuantity).toBeLessThanOrEqual(lot!.totalQuantity);

    const [reservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order1Id));
    expect(reservation.status).toBe('ACTIVE');
    expect(reservation.quantity).toBe(3000);
  });

  it('below minimum order quantity -> 422', async () => {
    sessionFor('buyer2');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 999,
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('below_minimum_order_quantity');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('order above available -> 422; exact available succeeds', async () => {
    sessionFor('buyer2');
    const rOver = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 2500,
    });
    expect(rOver.status).toBe(422);
    expect((await rOver.json()).error.code).toBe('insufficient_available_quantity');

    const rExact = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 2000,
    });
    expect(rExact.status).toBe(201);
    order2Id = (await rExact.json()).data.id;

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(0);
    expect(lot!.reservedQuantity).toBe(5000);
  });

  it('fully reserved listing disappears from buyer browse and detail', async () => {
    sessionFor('buyer1');
    const body = await (await LISTINGS_GET(new Request(BASE_LISTINGS))).json();
    const ids = body.data.items.map((l: { id: string }) => l.id);
    expect(ids).not.toContain(listingAId);
    expect(ids).toContain(listingCId);

    const detail = await LISTING_GET(new Request(`${BASE_LISTINGS}/${listingAId}`), {
      params: Promise.resolve({ id: listingAId }),
    });
    expect(detail.status).toBe(404);
  });

  it('cancel pending order releases reservation', async () => {
    sessionFor('buyer1');
    const res = await ORDER_CANCEL_POST(new Request(`${BASE_ORDERS}/${order1Id}/cancel`, { method: 'POST' }), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe('CANCELLED');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(3000);
    expect(lot!.reservedQuantity).toBe(2000);

    const [reservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order1Id));
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releaseReason).toBe('cancelled');

    const again = await ORDER_CANCEL_POST(new Request(`${BASE_ORDERS}/${order1Id}/cancel`, { method: 'POST' }), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(again.status).toBe(422);
    expect((await again.json()).error.code).toBe('order_not_cancellable');
  });

  it('expired reservation is released lazily on next read, idempotently', async () => {
    const past = new Date(Date.now() - 60_000);
    await db.update(orders).set({ expiresAt: past }).where(eq(orders.id, order2Id));
    await db
      .update(inventoryReservations)
      .set({ expiresAt: past })
      .where(eq(inventoryReservations.orderId, order2Id));

    sessionFor('buyer1');
    const body = await (await LISTINGS_GET(new Request(BASE_LISTINGS))).json();
    expect(body.data.items.map((l: { id: string }) => l.id)).toContain(listingAId);

    const [expired] = await db.select().from(orders).where(eq(orders.id, order2Id));
    expect(expired.status).toBe('EXPIRED');

    const [reservation] = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order2Id));
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releaseReason).toBe('expired');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(5000);
    expect(lot!.reservedQuantity).toBe(0);

    // Second sweep must not double-release.
    await LISTINGS_GET(new Request(BASE_LISTINGS));
    const lotAfter = await findLot(coopAId, 'maize', 'A');
    expect(lotAfter!.availableQuantity).toBe(5000);
    expect(lotAfter!.reservedQuantity).toBe(0);
  });

  it('paused listing rejects new orders with 422', async () => {
    sessionFor('staffA');
    const pause = await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingCId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      }),
      { params: Promise.resolve({ id: listingCId }) },
    );
    expect(pause.status).toBe(200);

    sessionFor('buyer2');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingCId,
      quantity: 1000,
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('listing_not_active');

    sessionFor('staffA');
    await LISTING_PATCH(
      new Request(`${BASE_LISTINGS}/${listingCId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: listingCId }) },
    );
  });

  it('order visibility: buyer cannot read another buyer order (404), staff of coop can (200)', async () => {
    sessionFor('buyer1');
    const rOwn = await ORDER_GET(new Request(`${BASE_ORDERS}/${order1Id}`), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(rOwn.status).toBe(200);

    sessionFor('buyer2');
    const rOther = await ORDER_GET(new Request(`${BASE_ORDERS}/${order1Id}`), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(rOther.status).toBe(404);

    sessionFor('staffB');
    const rForeignStaff = await ORDER_GET(new Request(`${BASE_ORDERS}/${order1Id}`), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(rForeignStaff.status).toBe(403);

    sessionFor('staffA');
    const rStaff = await ORDER_GET(new Request(`${BASE_ORDERS}/${order1Id}`), {
      params: Promise.resolve({ id: order1Id }),
    });
    expect(rStaff.status).toBe(200);
  });

  it('order lists are buyer-scoped', async () => {
    sessionFor('buyer1');
    const body = await (await ORDERS_GET(new Request(BASE_ORDERS))).json();
    const buyerIds = body.data.items.map((o: { buyerId: string }) => o.buyerId);
    expect(buyerIds.length).toBeGreaterThan(0);
    expect(new Set(buyerIds)).toEqual(new Set([identities.buyer1.userId]));
    expect(body.data.items.map((o: { id: string }) => o.id)).not.toContain(order2Id);
  });

  it('transporter cannot place orders (403)', async () => {
    sessionFor('transporter');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 1000,
    });
    expect(res.status).toBe(403);
  });

  it('order against lot with stock below MOQ floor -> 422 before availability', async () => {
    // listingC lot holds only 500 kg; MOQ (1,000) fails first.
    sessionFor('buyer2');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingCId,
      quantity: 500,
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('below_minimum_order_quantity');

    // And even at MOQ the lot cannot satisfy it.
    const rInsufficient = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingCId,
      quantity: 1000,
    });
    expect(rInsufficient.status).toBe(422);
    expect((await rInsufficient.json()).error.code).toBe('insufficient_available_quantity');
  });
});
