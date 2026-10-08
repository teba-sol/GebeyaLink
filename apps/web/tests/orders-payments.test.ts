import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as ORDERS_GET, POST as ORDERS_POST } from '../app/api/v1/orders/route';
import { GET as ORDER_GET } from '../app/api/v1/orders/[id]/route';
import { POST as ORDER_ACCEPT_POST } from '../app/api/v1/orders/[id]/accept/route';
import { POST as ORDER_REJECT_POST } from '../app/api/v1/orders/[id]/reject/route';
import { POST as ORDER_CANCEL_POST } from '../app/api/v1/orders/[id]/cancel/route';
import {
  GET as ORDER_PAYMENTS_GET,
  POST as ORDER_PAYMENTS_POST,
} from '../app/api/v1/orders/[id]/payments/route';
import { GET as PAYMENT_GET } from '../app/api/v1/payments/[id]/route';
import { POST as PAYMENT_CONFIRM_POST } from '../app/api/v1/payments/[id]/confirm/route';
import { POST as PAYMENT_FAIL_POST } from '../app/api/v1/payments/[id]/fail/route';
import { POST as LISTINGS_POST } from '../app/api/v1/marketplace/listings/route';
import { POST as COOPS_POST } from '../app/api/v1/cooperatives/route';
import { POST as CENTERS_POST } from '../app/api/v1/collection-centers/route';
import { POST as DELIVERIES_POST } from '../app/api/v1/deliveries/route';
import { POST as FARMERS_POST } from '../app/api/v1/farmers/route';
import { db } from '../server/db';
import { account, session, user, userRoles } from '../server/db/schema';
import { cooperativeMembers } from '../server/db/schema/cooperatives';
import { inventoryLots } from '../server/db/schema/inventory';
import { inventoryReservations, orders } from '../server/db/schema/orders';
import { auditEvents, payments } from '../server/db/schema/payments';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c5-${Date.now()}`;
const BASE_LISTINGS = 'http://localhost/api/v1/marketplace/listings';
const BASE_ORDERS = 'http://localhost/api/v1/orders';
const BASE_CENTERS = 'http://localhost/api/v1/collection-centers';
const BASE_DELIVERIES = 'http://localhost/api/v1/deliveries';
const BASE_COOPS = 'http://localhost/api/v1/cooperatives';
const BASE_PAYMENTS = 'http://localhost/api/v1/payments';

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
    user: { id: identity.userId, email: identity.email, name: 'C5 Test' },
  });
}

function p(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
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

async function postJson(
  url: string,
  handler: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>,
  payload: unknown,
  id = '',
) {
  return handler(
    new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id }) },
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
    ),
  });
}

async function reservationFor(orderId: string) {
  const [row] = await db
    .select()
    .from(inventoryReservations)
    .where(eq(inventoryReservations.orderId, orderId));
  return row;
}

async function forceExpire(orderId: string): Promise<void> {
  const past = new Date(Date.now() - 60_000);
  await db.update(orders).set({ expiresAt: past }).where(eq(orders.id, orderId));
  await db
    .update(inventoryReservations)
    .set({ expiresAt: past })
    .where(eq(inventoryReservations.orderId, orderId));
}

async function orderBody(id: string, who: 'buyer1' | 'buyer2' = 'buyer1') {
  sessionFor(who);
  const res = await ORDER_GET(new Request(`${BASE_ORDERS}/${id}`), p(id));
  expect(res.status).toBe(200);
  return (await res.json()).data;
}

let coopAId: string;
let coopBId: string;
let centerAId: string;
let farmerAId: string;
let lotAId: string;
let listingAId: string;
const orderIds: string[] = [];
let o1: string; // buyer1, 3000 kg — accept flow, later paid
let o2: string; // buyer2, 2000 kg — reject flow
let o3: string; // buyer2, 1000 kg — expiry-before-accept flow
let o4: string; // buyer2, 1000 kg — payment fail/resubmit flow
let o5: string; // buyer2, 1000 kg — cancel flow
let p1: string; // o1 payment, confirmed
let p2: string; // o4 payment, failed
let p3: string; // o4 payment, pending resubmission

function track(id: string): string {
  orderIds.push(id);
  return id;
}

describe('C5 - Orders & Payments', () => {
  beforeAll(async () => {
    for (const identity of Object.values(identities)) {
      const [row] = await db
        .insert(user)
        .values({ name: 'C5 Test', email: identity.email, emailVerified: true })
        .returning({ id: user.id });
      identity.userId = row.id;
      if (identity.role) {
        await db.insert(userRoles).values({ userId: row.id, role: identity.role });
      }
    }

    coopAId = await createCoop('C5 Coop A');
    coopBId = await createCoop('C5 Coop B');
    await addMembership(identities.staffA.userId, coopAId);
    await addMembership(identities.staffB.userId, coopBId);

    sessionFor('admin');
    const centerA = await postJson(BASE_CENTERS, CENTERS_POST, {
      cooperativeId: coopAId,
      name: 'C5 Center A',
      location: 'Adama',
    });
    expect(centerA.status).toBe(201);
    centerAId = (await centerA.json()).data.id;

    const farmerA = await postJson('http://localhost/api/v1/farmers', FARMERS_POST, {
      cooperativeId: coopAId,
      name: 'C5 Farmer A',
    });
    expect(farmerA.status).toBe(201);
    farmerAId = (await farmerA.json()).data.id;

    await acceptedDelivery({
      cooperativeId: coopAId,
      collectionCenterId: centerAId,
      farmerId: farmerAId,
      productId: 'maize',
      quantity: 5000,
      qualityGrade: 'A',
    });

    const lotA = await findLot(coopAId, 'maize', 'A');
    expect(lotA, 'lotA (maize A, coopA)').toBeDefined();
    lotAId = lotA!.id;

    sessionFor('staffA');
    const lA = await postJson(BASE_LISTINGS, LISTINGS_POST, {
      inventoryLotId: lotAId,
      pricePerUnit: 45,
    });
    expect(lA.status).toBe(201);
    listingAId = (await lA.json()).data.id;
  });

  afterAll(async () => {
    try {
      // audit_events has no FKs: remove this run's rows before orders.
      if (orderIds.length) {
        await db.delete(auditEvents).where(inArray(auditEvents.orderId, orderIds));
      }
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

  it('accept fixture: buyer places a pending order that reserves inventory', async () => {
    sessionFor('buyer1');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 3000,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    o1 = track(body.data.id);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.productTotal).toBe(135000);
    expect(body.data.paymentStatus).toBeNull();

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('accept authz: anon 401, no-role 403, transporter 403, buyer 403, cross-coop staff 403', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1))).status).toBe(401);

    sessionFor('none');
    expect((await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1))).status).toBe(403);

    sessionFor('transporter');
    expect((await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1))).status).toBe(403);

    sessionFor('buyer1');
    expect((await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1))).status).toBe(403);

    sessionFor('staffB');
    expect((await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1))).status).toBe(403);

    const still = await db.query.orders.findFirst({ where: eq(orders.id, o1) });
    expect(still!.status).toBe('PENDING');
  });

  it('accept: member staff commits the order, converts the reservation, locks price and quantities', async () => {
    sessionFor('staffA');
    const res = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('ACCEPTED');
    expect(body.data.acceptedAt).not.toBeNull();
    expect(body.data.rejectionReason).toBeNull();
    // Price lock (BR-014): snapshot untouched by acceptance.
    expect(body.data.unitPrice).toBe(45);
    expect(body.data.productTotal).toBe(135000);
    expect(body.data.quantity).toBe(3000);

    const reservation = await reservationFor(o1);
    expect(reservation.status).toBe('CONVERTED');
    expect(reservation.releaseReason).toBeNull();

    // Commitment never moves lot quantities: still reserved, never available.
    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('accept is single-shot: staff re-accept 422, admin accept 422', async () => {
    sessionFor('staffA');
    const again = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1));
    expect(again.status).toBe(422);
    expect((await again.json()).error.code).toBe('order_not_pending');

    sessionFor('admin');
    const byAdmin = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o1}/accept`, { method: 'POST' }), p(o1));
    expect(byAdmin.status).toBe(422);
    expect((await byAdmin.json()).error.code).toBe('order_not_pending');

    const reservation = await reservationFor(o1);
    expect(reservation.status).toBe('CONVERTED');
  });

  it('accepted order is immune to the expiry sweep', async () => {
    await forceExpire(o1);

    sessionFor('buyer1');
    await ORDERS_GET(new Request(BASE_ORDERS));

    const row = await db.query.orders.findFirst({ where: eq(orders.id, o1) });
    expect(row!.status).toBe('ACCEPTED');
    const reservation = await reservationFor(o1);
    expect(reservation.status).toBe('CONVERTED');
    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('reject fixture: buyer places another pending order', async () => {
    sessionFor('buyer2');
    const res = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 2000,
    });
    expect(res.status).toBe(201);
    o2 = track((await res.json()).data.id);

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(0);
    expect(lot!.reservedQuantity).toBe(5000);
  });

  it('reject authz and validation: anon 401, buyer 403, cross staff 403, bad reasons 400', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(
      (await ORDER_REJECT_POST(
        new Request(`${BASE_ORDERS}/${o2}/reject`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rejectionReason: 'quality_issue' }),
        }),
        p(o2),
      )).status,
    ).toBe(401);

    sessionFor('buyer2');
    expect(
      (await ORDER_REJECT_POST(
        new Request(`${BASE_ORDERS}/${o2}/reject`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rejectionReason: 'quality_issue' }),
        }),
        p(o2),
      )).status,
    ).toBe(403);

    sessionFor('staffB');
    expect(
      (await ORDER_REJECT_POST(
        new Request(`${BASE_ORDERS}/${o2}/reject`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rejectionReason: 'quality_issue' }),
        }),
        p(o2),
      )).status,
    ).toBe(403);

    sessionFor('staffA');
    const missing = await ORDER_REJECT_POST(
      new Request(`${BASE_ORDERS}/${o2}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      p(o2),
    );
    expect(missing.status).toBe(400);

    const unknownReason = await ORDER_REJECT_POST(
      new Request(`${BASE_ORDERS}/${o2}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'not_a_reason' }),
      }),
      p(o2),
    );
    expect(unknownReason.status).toBe(400);

    const otherWithoutExplanation = await ORDER_REJECT_POST(
      new Request(`${BASE_ORDERS}/${o2}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'other' }),
      }),
      p(o2),
    );
    expect(otherWithoutExplanation.status).toBe(400);

    const still = await db.query.orders.findFirst({ where: eq(orders.id, o2) });
    expect(still!.status).toBe('PENDING');
  });

  it('reject: releases reservation back to the lot and records the reason', async () => {
    sessionFor('staffA');
    const res = await ORDER_REJECT_POST(
      new Request(`${BASE_ORDERS}/${o2}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'quality_issue', explanation: 'damaged kernels' }),
      }),
      p(o2),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('REJECTED');
    expect(body.data.rejectedAt).not.toBeNull();
    expect(body.data.rejectionReason).toBe('quality_issue');
    expect(body.data.rejectionExplanation).toBe('damaged kernels');

    const reservation = await reservationFor(o2);
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releaseReason).toBe('rejected');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
    expect(lot!.status).toBe('AVAILABLE');
  });

  it('rejected order is terminal: re-reject and accept both 422', async () => {
    sessionFor('staffA');
    const reReject = await ORDER_REJECT_POST(
      new Request(`${BASE_ORDERS}/${o2}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'quality_issue' }),
      }),
      p(o2),
    );
    expect(reReject.status).toBe(422);
    expect((await reReject.json()).error.code).toBe('order_not_pending');

    const lateAccept = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o2}/accept`, { method: 'POST' }), p(o2));
    expect(lateAccept.status).toBe(422);
    expect((await lateAccept.json()).error.code).toBe('order_not_pending');
  });

  it('due order expires before it can be accepted (sweep wins)', async () => {
    sessionFor('buyer2');
    const placed = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 1000,
    });
    expect(placed.status).toBe(201);
    o3 = track((await placed.json()).data.id);
    await forceExpire(o3);

    sessionFor('staffA');
    const res = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o3}/accept`, { method: 'POST' }), p(o3));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('order_not_pending');

    const row = await db.query.orders.findFirst({ where: eq(orders.id, o3) });
    expect(row!.status).toBe('EXPIRED');
    const reservation = await reservationFor(o3);
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releaseReason).toBe('expired');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('cancel after acceptance -> 422 order_not_cancellable', async () => {
    sessionFor('buyer1');
    const res = await ORDER_CANCEL_POST(new Request(`${BASE_ORDERS}/${o1}/cancel`, { method: 'POST' }), p(o1));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('order_not_cancellable');

    const row = await db.query.orders.findFirst({ where: eq(orders.id, o1) });
    expect(row!.status).toBe('ACCEPTED');
  });

  it('buyer still cancels a pending order, releasing the reservation', async () => {
    sessionFor('buyer2');
    const placed = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 1000,
    });
    expect(placed.status).toBe(201);
    o5 = track((await placed.json()).data.id);

    const res = await ORDER_CANCEL_POST(new Request(`${BASE_ORDERS}/${o5}/cancel`, { method: 'POST' }), p(o5));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe('CANCELLED');

    const reservation = await reservationFor(o5);
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releaseReason).toBe('cancelled');

    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(2000);
    expect(lot!.reservedQuantity).toBe(3000);
  });

  it('payment cannot be submitted for a pending order -> 422 order_not_accepted', async () => {
    sessionFor('buyer2');
    const placed = await postJson(BASE_ORDERS, ORDERS_POST, {
      listingId: listingAId,
      quantity: 1000,
    });
    expect(placed.status).toBe(201);
    o4 = track((await placed.json()).data.id);

    const res = await postJson(`${BASE_ORDERS}/${o4}/payments`, ORDER_PAYMENTS_POST, { amount: 45000 }, o4);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('order_not_accepted');
  });

  it('payment amount must equal product total -> 422 payment_amount_mismatch', async () => {
    sessionFor('buyer1');
    const res = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, { amount: 100000 }, o1);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('payment_amount_mismatch');
  });

  it('payment amount below total -> 422 as well', async () => {
    sessionFor('buyer1');
    const res = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, { amount: 100 }, o1);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('payment_amount_mismatch');
  });

  it('buyer submits a pending payment attempt and the order surfaces it', async () => {
    sessionFor('buyer1');
    const res = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, {
      amount: 135000,
      method: 'bank_transfer',
      reference: 'C5-REF-1',
    }, o1);
    expect(res.status).toBe(201);
    const body = await res.json();
    p1 = body.data.id;
    expect(body.data.status).toBe('PENDING');
    expect(body.data.amount).toBe(135000);
    expect(body.data.buyerId).toBe(identities.buyer1.userId);

    const order = await orderBody(o1);
    expect(order.status).toBe('ACCEPTED');
    expect(order.paymentStatus).toBe('PENDING');
  });

  it('second pending attempt for the same order -> 422 payment_already_pending', async () => {
    sessionFor('buyer1');
    const res = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, { amount: 135000 }, o1);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('payment_already_pending');
  });

  it('payment authz: anon 401, transporter 403, cross buyer 404, cross staff 403, staff submit 403', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await ORDER_PAYMENTS_GET(new Request(`${BASE_ORDERS}/${o1}/payments`), p(o1))).status).toBe(401);

    sessionFor('transporter');
    expect((await ORDER_PAYMENTS_GET(new Request(`${BASE_ORDERS}/${o1}/payments`), p(o1))).status).toBe(403);

    sessionFor('buyer2');
    expect((await ORDER_PAYMENTS_GET(new Request(`${BASE_ORDERS}/${o1}/payments`), p(o1))).status).toBe(404);
    const crossSubmit = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, { amount: 135000 }, o1);
    expect(crossSubmit.status).toBe(404);

    sessionFor('staffB');
    expect((await ORDER_PAYMENTS_GET(new Request(`${BASE_ORDERS}/${o1}/payments`), p(o1))).status).toBe(403);

    sessionFor('staffA');
    const staffSubmit = await postJson(`${BASE_ORDERS}/${o1}/payments`, ORDER_PAYMENTS_POST, { amount: 135000 }, o1);
    expect(staffSubmit.status).toBe(403);
  });

  it('confirm authz: buyer 403, cross-coop staff 403', async () => {
    sessionFor('buyer1');
    const byBuyer = await PAYMENT_CONFIRM_POST(new Request(`${BASE_PAYMENTS}/${p1}/confirm`, { method: 'POST' }), p(p1));
    expect(byBuyer.status).toBe(403);

    sessionFor('staffB');
    const cross = await PAYMENT_CONFIRM_POST(new Request(`${BASE_PAYMENTS}/${p1}/confirm`, { method: 'POST' }), p(p1));
    expect(cross.status).toBe(403);

    const still = await db.query.payments.findFirst({ where: eq(payments.id, p1) });
    expect(still!.status).toBe('PENDING');
  });

  it('cooperative confirms payment: attempt CONFIRMED and order PAYMENT_CONFIRMED atomically', async () => {
    sessionFor('staffA');
    const res = await PAYMENT_CONFIRM_POST(new Request(`${BASE_PAYMENTS}/${p1}/confirm`, { method: 'POST' }), p(p1));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('CONFIRMED');
    expect(body.data.confirmedBy).toBe(identities.staffA.userId);
    expect(body.data.confirmedAt).not.toBeNull();

    const order = await orderBody(o1);
    expect(order.status).toBe('PAYMENT_CONFIRMED');
    expect(order.paymentStatus).toBe('CONFIRMED');

    const fetched = await PAYMENT_GET(new Request(`${BASE_PAYMENTS}/${p1}`), p(p1));
    expect(fetched.status).toBe(200);
    expect((await fetched.json()).data.status).toBe('CONFIRMED');
  });

  it('re-confirm an already confirmed payment -> 422 payment_not_pending', async () => {
    sessionFor('staffA');
    const res = await PAYMENT_CONFIRM_POST(new Request(`${BASE_PAYMENTS}/${p1}/confirm`, { method: 'POST' }), p(p1));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('payment_not_pending');
  });

  it('failed payment keeps order ACCEPTED and lets the buyer resubmit', async () => {
    sessionFor('staffA');
    const accepted = await ORDER_ACCEPT_POST(new Request(`${BASE_ORDERS}/${o4}/accept`, { method: 'POST' }), p(o4));
    expect(accepted.status).toBe(200);

    sessionFor('buyer2');
    const submitted = await postJson(`${BASE_ORDERS}/${o4}/payments`, ORDER_PAYMENTS_POST, { amount: 45000 }, o4);
    expect(submitted.status).toBe(201);
    p2 = (await submitted.json()).data.id;

    sessionFor('staffA');
    const failed = await postJson(`${BASE_PAYMENTS}/${p2}/fail`, PAYMENT_FAIL_POST, {
      reason: 'transfer reference not found',
    }, p2);
    expect(failed.status).toBe(200);
    const failedBody = await failed.json();
    expect(failedBody.data.status).toBe('FAILED');
    expect(failedBody.data.failureReason).toBe('transfer reference not found');
    expect(failedBody.data.failedAt).not.toBeNull();

    // Edge case 8: order stays ACCEPTED — not confirmed, not auto-cancelled.
    const order = await orderBody(o4, 'buyer2');
    expect(order.status).toBe('ACCEPTED');
    expect(order.paymentStatus).toBe('FAILED');

    sessionFor('buyer2');
    const resubmitted = await postJson(`${BASE_ORDERS}/${o4}/payments`, ORDER_PAYMENTS_POST, {
      amount: 45000,
      reference: 'C5-REF-2',
    }, o4);
    expect(resubmitted.status).toBe(201);
    const p3Body = (await resubmitted.json()).data;
    p3 = p3Body.id;
    expect(p3Body.status).toBe('PENDING');
  });

  it('fail only applies to pending attempts -> 422 payment_not_pending', async () => {
    sessionFor('staffA');
    const alreadyConfirmed = await postJson(`${BASE_PAYMENTS}/${p1}/fail`, PAYMENT_FAIL_POST, {
      reason: 'should not apply',
    }, p1);
    expect(alreadyConfirmed.status).toBe(422);
    expect((await alreadyConfirmed.json()).error.code).toBe('payment_not_pending');

    const alreadyFailed = await postJson(`${BASE_PAYMENTS}/${p2}/fail`, PAYMENT_FAIL_POST, {
      reason: 'should not apply twice',
    }, p2);
    expect(alreadyFailed.status).toBe(422);
    expect((await alreadyFailed.json()).error.code).toBe('payment_not_pending');
  });

  it('payment visibility: buyer cross 404, staff cross 403, owner 200, list shows attempts', async () => {
    sessionFor('buyer2');
    const crossBuyer = await PAYMENT_GET(new Request(`${BASE_PAYMENTS}/${p1}`), p(p1));
    expect(crossBuyer.status).toBe(404);

    sessionFor('staffB');
    const crossStaff = await PAYMENT_GET(new Request(`${BASE_PAYMENTS}/${p1}`), p(p1));
    expect(crossStaff.status).toBe(403);

    sessionFor('buyer1');
    const own = await PAYMENT_GET(new Request(`${BASE_PAYMENTS}/${p1}`), p(p1));
    expect(own.status).toBe(200);

    sessionFor('buyer2');
    const listRes = await ORDER_PAYMENTS_GET(new Request(`${BASE_ORDERS}/${o4}/payments`), p(o4));
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()).data as Array<{ id: string; status: string }>;
    expect(list.map((x) => x.id).sort()).toEqual([p2, p3].sort());
    const statuses = Object.fromEntries(list.map((x) => [x.id, x.status]));
    expect(statuses[p2]).toBe('FAILED');
    expect(statuses[p3]).toBe('PENDING');
  });

  it('audit trail records every order and payment state change for this run', async () => {
    const rows = await db
      .select()
      .from(auditEvents)
      .where(inArray(auditEvents.orderId, orderIds));

    const byOrder = new Map<string, string[]>();
    for (const row of rows) {
      const list = byOrder.get(row.orderId ?? '') ?? [];
      list.push(row.eventType);
      byOrder.set(row.orderId ?? '', list);
    }
    const sorted = (list: string[] | undefined) => [...(list ?? [])].sort();

    expect(sorted(byOrder.get(o1))).toEqual(
      ['order.placed', 'order.accepted', 'payment.submitted', 'payment.confirmed'].sort(),
    );
    expect(sorted(byOrder.get(o2))).toEqual(['order.placed', 'order.rejected'].sort());
    expect(sorted(byOrder.get(o3))).toEqual(['order.placed', 'order.expired'].sort());
    expect(sorted(byOrder.get(o5))).toEqual(['order.placed', 'order.cancelled'].sort());
    expect(sorted(byOrder.get(o4))).toEqual(
      ['order.placed', 'order.accepted', 'payment.submitted', 'payment.failed', 'payment.submitted'].sort(),
    );

    const expired = rows.find((r) => r.eventType === 'order.expired');
    expect(expired!.actorId).toBeNull();
    const accepted = rows.find((r) => r.eventType === 'order.accepted');
    expect(accepted!.actorId).toBe(identities.staffA.userId);
    const confirmed = rows.find((r) => r.eventType === 'payment.confirmed');
    expect(confirmed!.entityType).toBe('payment');
    expect(confirmed!.entityId).toBe(p1);

    // Final inventory invariant: o1 (3000) + o4 (1000) remain committed.
    const lot = await findLot(coopAId, 'maize', 'A');
    expect(lot!.availableQuantity).toBe(1000);
    expect(lot!.reservedQuantity).toBe(4000);
  });
});
