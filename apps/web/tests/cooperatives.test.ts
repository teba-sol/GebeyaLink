import { like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH } from '../app/api/v1/cooperatives/[id]/route';
import { GET as LIST_GET, POST as LIST_POST } from '../app/api/v1/cooperatives/route';
import { db } from '../server/db';
import { user, userRoles } from '../server/db/schema';
import { cooperativeMembers, cooperatives } from '../server/db/schema/cooperatives';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/server/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

const EMAIL_TOKEN = `c1-${Date.now()}`;
const BASE = 'http://localhost/api/v1/cooperatives';

const identities = {
  admin: { userId: '', email: `${EMAIL_TOKEN}-admin@example.test`, role: 'admin' as const },
  staff: {
    userId: '',
    email: `${EMAIL_TOKEN}-staff@example.test`,
    role: 'cooperative_staff' as const,
  },
  none: { userId: '', email: `${EMAIL_TOKEN}-none@example.test`, role: null },
};

function sessionFor(key: keyof typeof identities): void {
  const identity = identities[key];
  mocks.getSession.mockResolvedValue({
    session: { id: `session-${identity.userId}` },
    user: { id: identity.userId, email: identity.email, name: 'C1 Test' },
  });
}

async function createViaApi(name: string, slug?: string): Promise<{ id: string; slug: string }> {
  sessionFor('admin');
  const req = new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(slug ? { name, slug } : { name }),
  });
  const res = await LIST_POST(req);
  expect(res.status).toBe(201);
  const body = await res.json();
  return { id: body.data.id as string, slug: body.data.slug as string };
}

beforeAll(async () => {
  for (const identity of Object.values(identities)) {
    const [row] = await db
      .insert(user)
      .values({ name: 'C1 Test', email: identity.email, emailVerified: true })
      .returning({ id: user.id });
    identity.userId = row.id;
    if (identity.role) {
      await db.insert(userRoles).values({ userId: row.id, role: identity.role });
    }
  }
});

afterAll(async () => {
  await db.delete(cooperatives).where(like(cooperatives.slug, 'ggg-%'));
  await db.delete(user).where(like(user.email, `${EMAIL_TOKEN}-%`));
});

describe('cooperatives API (C1) — auth & scope', () => {
  it('rejects unauthenticated list requests (401)', async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated single-cooperative requests (401)', async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await GET(new Request(BASE), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(401);
  });

  it('treats a signed-in but role-less account as forbidden (403)', async () => {
    sessionFor('none');
    const res = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(res.status).toBe(403);
  });

  it('forbids staff from creating cooperatives (403)', async () => {
    sessionFor('staff');
    const req = new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Staff Try' }),
    });
    const res = await LIST_POST(req);
    expect(res.status).toBe(403);
  });

  it('forbids staff deletion (403)', async () => {
    const coop = await createViaApi('Ggg Staff Delete C1');
    sessionFor('staff');
    const req = new Request(`${BASE}/${coop.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: coop.id }) });
    expect(res.status).toBe(403);
  });
});

describe('cooperatives API (C1) — admin create/list', () => {
  it('creates a cooperative with an auto-generated slug (201)', async () => {
    const coop = await createViaApi('Ggg Alpha C1');
    expect(coop.slug).toBe('ggg-alpha-c1');
    sessionFor('admin');
    const res = await GET(new Request(`${BASE}/${coop.id}`), {
      params: Promise.resolve({ id: coop.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Ggg Alpha C1');
    expect(body.data.slug).toBe('ggg-alpha-c1');
    expect(body.data.status).toBe('active');
    expect(body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('keeps an explicit admin-provided slug (201)', async () => {
    const coop = await createViaApi('Ggg Explicit C1', 'ggg-explicit');
    expect(coop.slug).toBe('ggg-explicit');
  });

  it('returns 409 on duplicate slug', async () => {
    sessionFor('admin');
    const req = new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ggg Dup C1', slug: 'ggg-explicit' }),
    });
    const res = await LIST_POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('conflict');
  });

  it('rejects invalid creation payloads with 400', async () => {
    sessionFor('admin');
    const req = new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    const res = await LIST_POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('validation_error');
  });

  it('returns a paginated list for admin', async () => {
    sessionFor('admin');
    const res = await LIST_GET(new Request(`${BASE}?page=1&limit=5`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(5);
    expect(body.data.items.length).toBeLessThanOrEqual(5);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
  });
});

describe('cooperatives API (C1) — cooperative staff scope', () => {
  it('scopes staff list to their cooperative memberships', async () => {
    const coopA = await createViaApi('Ggg Member A C1');
    await createViaApi('Ggg Member B C1');

    await db
      .insert(cooperativeMembers)
      .values({ cooperativeId: coopA.id, userId: identities.staff.userId, active: true });

    sessionFor('staff');
    const res = await LIST_GET(new Request(`${BASE}?page=1&limit=20`));
    expect(res.status).toBe(200);
    const body = await res.json();
    const slugs = (body.data.items as { slug: string }[]).map((i) => i.slug);
    expect(slugs).toContain('ggg-member-a-c1');
    expect(slugs).not.toContain('ggg-member-b-c1');
  });

  it('gives staff 403 on a cooperative outside their membership', async () => {
    const coop = await createViaApi('Ggg Outside Scope C1');
    const scopeCoop = await createViaApi('Ggg Scope C1');
    await db
      .insert(cooperativeMembers)
      .values({ cooperativeId: scopeCoop.id, userId: identities.staff.userId, active: true });

    sessionFor('staff');
    const res = await GET(new Request(BASE), {
      params: Promise.resolve({ id: coop.id }),
    });
    expect(res.status).toBe(403);
  });

  it('lets staff update contact fields but not status (200 then 403)', async () => {
    const coop = await createViaApi('Ggg Staff Edits C1');
    await db
      .insert(cooperativeMembers)
      .values({ cooperativeId: coop.id, userId: identities.staff.userId, active: true });

    sessionFor('staff');
    const patchReq = new Request(`${BASE}/${coop.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+251911000000' }),
    });
    const patched = await PATCH(patchReq, { params: Promise.resolve({ id: coop.id }) });
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.data.phone).toBe('+251911000000');

    const statusReq = new Request(`${BASE}/${coop.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const statusRes = await PATCH(statusReq, { params: Promise.resolve({ id: coop.id }) });
    expect(statusRes.status).toBe(403);
  });
});

describe('cooperatives API (C1) — lifecycle', () => {
  it('allows admin status change and keeps the slug immutable', async () => {
    const coop = await createViaApi('Ggg Admin Edits C1');

    sessionFor('admin');
    const patchReq = new Request(`${BASE}/${coop.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'inactive', slug: 'should-be-ignored' }),
    });
    const res = await PATCH(patchReq, { params: Promise.resolve({ id: coop.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('inactive');
    expect(body.data.slug).toBe(coop.slug);
  });

  it('soft-deletes as admin and hides it from get/list (204, 404, excluded)', async () => {
    const coop = await createViaApi('Ggg Soft Delete C1');

    sessionFor('admin');
    const delReq = new Request(`${BASE}/${coop.id}`, { method: 'DELETE' });
    const delRes = await DELETE(delReq, { params: Promise.resolve({ id: coop.id }) });
    expect(delRes.status).toBe(204);

    const getRes = await GET(delReq, { params: Promise.resolve({ id: coop.id }) });
    expect(getRes.status).toBe(404);

    const listRes = await LIST_GET(new Request(`${BASE}?page=1&limit=100`));
    const listBody = await listRes.json();
    const slugs = (listBody.data.items as { slug: string }[]).map((i) => i.slug);
    expect(slugs).not.toContain('ggg-soft-delete-c1');
  });
});
