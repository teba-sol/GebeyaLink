import { eq, like } from 'drizzle-orm';
import type { FarmerDto } from '@gebeyalink/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET, PATCH } from '../app/api/v1/farmers/[id]/route';
import { GET as LIST_GET, POST as LIST_POST } from '../app/api/v1/farmers/route';
import { db } from '../server/db';
import { user, userRoles } from '../server/db/schema';
import { cooperativeMembers, cooperatives } from '../server/db/schema/cooperatives';
import { farmers } from '../server/db/schema/farmers';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c2-${Date.now()}`;
const BASE = 'http://localhost/api/v1/farmers';

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
    user: { id: identity.userId, email: identity.email, name: 'C2 Test' },
  });
}

async function createCoop(name: string): Promise<string> {
  sessionFor('admin');
  const req = new Request('http://localhost/api/v1/cooperatives', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const res = await (await import('../app/api/v1/cooperatives/route')).POST(req);
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.data.id as string;
}

async function createFarmer(
  sessionKey: keyof typeof identities,
  cooperativeId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ status: number; body: { data?: FarmerDto; error?: { code?: string } } }> {
  sessionFor(sessionKey);
  const req = new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cooperativeId,
      name: `Co2 Farmer ${cooperativeId}`,
      ...overrides,
    }),
  });
  const res = await LIST_POST(req);
  const body = (await res.json()) as { data?: FarmerDto; error?: { code?: string } };
  return { status: res.status, body };
}

async function addMembership(userId: string, cooperativeId: string): Promise<void> {
  await db.insert(cooperativeMembers).values({ cooperativeId, userId, active: true });
}

beforeAll(async () => {
  for (const identity of Object.values(identities)) {
    const [row] = await db
      .insert(user)
      .values({ name: 'C2 Test', email: identity.email, emailVerified: true })
      .returning({ id: user.id });
    identity.userId = row.id;
    if (identity.role) {
      await db.insert(userRoles).values({ userId: row.id, role: identity.role });
    }
  }
});

afterAll(async () => {
  await db.delete(cooperatives).where(like(cooperatives.slug, 'co2-%'));
  await db.delete(user).where(like(user.email, `${EMAIL_TOKEN}-%`));
});

describe('farmers API (C2) — auth & roles', () => {
  it('rejects unauthenticated list/create/get (401)', async () => {
    mocks.getSession.mockResolvedValue(null);
    const list = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(list.status).toBe(401);
    const create = await LIST_POST(
      new Request(BASE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(create.status).toBe(401);
    const get = await GET(new Request(BASE), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(get.status).toBe(401);
  });

  it('treats a signed-in but role-less account as forbidden (403)', async () => {
    sessionFor('none');
    const res = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(res.status).toBe(403);
  });

  it('forbids buyers from listing or creating farmers (403)', async () => {
    const coopId = await createCoop('Co2 Buyer C2');
    sessionFor('buyer');
    const list = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(list.status).toBe(403);
    const create = await createFarmer('buyer', coopId);
    expect(create.status).toBe(403);
  });
});

describe('farmers API (C2) — create & validation', () => {
  it('admin creates a farmer (201) with default active and ISO dates', async () => {
    const coopId = await createCoop('Co2 Create C2');
    const created = await createFarmer('admin', coopId, {
      phone: '+251900000001',
      location: 'Arsi, Ethiopia',
      registeredAt: '2023-06-01T00:00:00.000Z',
    });
    expect(created.status).toBe(201);
    expect(created.body.data!.cooperativeId).toBe(coopId);
    expect(created.body.data!.active).toBe(true);
    expect(created.body.data!.phone).toBe('+251900000001');
    expect(created.body.data!.registeredAt).toBe('2023-06-01T00:00:00.000Z');
    expect(created.body.data!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('returns 409 for a duplicate phone within the same cooperative', async () => {
    const coopId = await createCoop('Co2 Dup Phone C2');
    await createFarmer('admin', coopId, { phone: '+251900000002' });
    const dup = await createFarmer('admin', coopId, { phone: '+251900000002' });
    expect(dup.status).toBe(409);
    expect(dup.body.error?.code).toBe('conflict');
  });

  it('rejects invalid create payloads with 400 (bad cooperativeId / short name)', async () => {
    sessionFor('admin');
    const bad = await createFarmer('admin', 'not-a-uuid');
    expect(bad.status).toBe(400);
    const short = await createFarmer('admin', '00000000-0000-0000-0000-000000000000', {
      name: 'x',
    });
    expect(short.status).toBe(400);
  });

  it('rejects PATCH payloads attempting to change cooperativeId / registeredAt (400)', async () => {
    const coopId = await createCoop('Co2 Immutable C2');
    const created = await createFarmer('admin', coopId, { phone: '+251900000003' });
    const farmerId = created.body.data!.id;
    sessionFor('admin');
    const req = new Request(`${BASE}/${farmerId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cooperativeId: coopId, registeredAt: '2024-01-01T00:00:00.000Z' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: farmerId }) });
    expect(res.status).toBe(400);
  });
});

describe('farmers API (C2) — cooperative ownership scope', () => {
  it('lets staff and collection agents create farmers inside their cooperative (201)', async () => {
    const coopStaff = await createCoop('Co2 Staff Scope C2');
    const coopAgent = await createCoop('Co2 Agent Scope C2');
    await addMembership(identities.staff.userId, coopStaff);
    await addMembership(identities.agent.userId, coopAgent);

    const byStaff = await createFarmer('staff', coopStaff, { phone: '+251900000011' });
    expect(byStaff.status).toBe(201);
    const byAgent = await createFarmer('agent', coopAgent, { phone: '+251900000012' });
    expect(byAgent.status).toBe(201);
  });

  it('forbids staff from creating farmers in a cooperative outside their membership (403)', async () => {
    const inside = await createCoop('Co2 Inside C2');
    const outside = await createCoop('Co2 Outside C2');
    await addMembership(identities.staff.userId, inside);
    const res = await createFarmer('staff', outside, { phone: '+251900000013' });
    expect(res.status).toBe(403);
  });

  it('scopes the staff list to their cooperative and supports search', async () => {
    const coopIn = await createCoop('Co2 Scope List A C2');
    const coopOut = await createCoop('Co2 Scope List B C2');
    await addMembership(identities.staff.userId, coopIn);
    await createFarmer('admin', coopIn, { name: 'Tadesse Bekele', phone: '+251900000021' });
    await createFarmer('admin', coopOut, { name: 'Zahelen Out', phone: '+251900000022' });

    sessionFor('staff');
    const list = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(list.status).toBe(200);
    const listBody = await list.json();
    const names = (listBody.data.items as { name: string }[]).map((i) => i.name);
    expect(names).toContain('Tadesse Bekele');
    expect(names).not.toContain('Zahelen Out');

    const search = await LIST_GET(new Request(`${BASE}?search=tadesse&page=1&limit=20`));
    const searchBody = await search.json();
    expect((searchBody.data.items as { name: string }[]).map((i) => i.name)).toEqual([
      'Tadesse Bekele',
    ]);
  });

  it('lets staff update a farmer in scope and deactivate via active=false (200)', async () => {
    const coopId = await createCoop('Co2 Update C2');
    await addMembership(identities.staff.userId, coopId);
    const created = await createFarmer('staff', coopId, { phone: '+251900000031' });
    const farmerId = created.body.data!.id;

    sessionFor('staff');
    const req = new Request(`${BASE}/${farmerId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: false, location: 'Debre Zeit' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: farmerId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.active).toBe(false);
    expect(body.data.location).toBe('Debre Zeit');

    sessionFor('agent');
    const forbidden = await GET(new Request(BASE), {
      params: Promise.resolve({ id: farmerId }),
    });
    expect(forbidden.status).toBe(403);
  });

  it('hides soft-deleted farmers from get/list (404 / excluded)', async () => {
    const coopId = await createCoop('Co2 Soft Delete C2');
    const created = await createFarmer('admin', coopId, { phone: '+251900000041' });
    const farmerId = created.body.data!.id;
    await db
      .update(farmers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(farmers.id, farmerId));

    sessionFor('admin');
    const get = await GET(new Request(BASE), { params: Promise.resolve({ id: farmerId }) });
    expect(get.status).toBe(404);

    const list = await LIST_GET(new Request(`${BASE}?cooperativeId=${coopId}&page=1&limit=20`));
    const listBody = await list.json();
    const ids = (listBody.data.items as { id: string }[]).map((i) => i.id);
    expect(ids).not.toContain(farmerId);
  });
});
