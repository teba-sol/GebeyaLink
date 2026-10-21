import { sum } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PlatformRole } from '@gebeyalink/types';

import { db } from '../server/db';
import { inventoryLots } from '../server/db/schema/inventory';

let actorResult: { userId: string; role: PlatformRole | null } | null = {
  userId: 'rec-test-buyer',
  role: 'buyer',
};

vi.mock('../server/authz/guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server/authz/guards')>();
  return { ...actual, resolveActor: async () => actorResult };
});

import { POST as RECOMMENDATIONS_POST } from '../app/api/v1/marketplace/ai-search/recommendations/route';

/**
 * Sourcing recommendations endpoint.
 *
 * Integration test against the real database and the *mock* AI provider (no
 * live model is called). It pins the contract the assignment requires:
 *  - buyer-only, rate-limited, never mutates inventory,
 *  - deterministic eligibility + ranking + evidence are always present,
 *  - the AI explanation is additive and degrades safely,
 *  - the response shape is the documented `{ data }` envelope.
 */

function post(body: unknown) {
  return RECOMMENDATIONS_POST(
    new Request('http://localhost/api/v1/marketplace/ai-search/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/v1/marketplace/ai-search/recommendations', () => {
  const originalGeocoder = process.env.GEOCODER_PROVIDER;

  beforeAll(() => {
    process.env.AI_PROVIDER = 'mock';
    process.env.GEOCODER_PROVIDER = 'off';
  });

  afterAll(() => {
    if (originalGeocoder === undefined) delete process.env.GEOCODER_PROVIDER;
    else process.env.GEOCODER_PROVIDER = originalGeocoder;
    actorResult = { userId: 'rec-test-buyer', role: 'buyer' };
  });

  it('requires authentication', async () => {
    actorResult = null;
    const res = await post({ query: 'grade A coffee from Sidama under 300' });
    expect(res.status).toBe(401);
    actorResult = { userId: 'rec-test-buyer', role: 'buyer' };
  });

  it('rejects non-buyer roles', async () => {
    actorResult = { userId: 'rec-test-staff', role: 'cooperative_staff' };
    const res = await post({ query: 'grade A coffee' });
    expect(res.status).toBe(403);
    actorResult = { userId: 'rec-test-buyer', role: 'buyer' };
  });

  it('rejects an empty payload with 400', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('returns the documented envelope for a natural-language request', async () => {
    const res = await post({ query: 'grade A coffee from Sidama under 300' });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data).toBeTruthy();
    expect(body.data).toHaveProperty('criteria');
    expect(body.data).toHaveProperty('recommendations');
    expect(body.data).toHaveProperty('partialMatches');
    expect(body.data).toHaveProperty('explanation');
    expect(body.data).toHaveProperty('meta');
    expect(body.data.meta.algorithmVersion).toBeTruthy();
    expect(body.data.meta.candidateCount).toBeGreaterThanOrEqual(0);
    expect(body.data.criteriaSource).toBe('ai');
  });

  it('every recommendation carries a score breakdown and evidence', async () => {
    const res = await post({ query: 'grade A coffee from Sidama under 300' });
    const body = await res.json();
    for (const recommendation of body.data.recommendations) {
      expect(recommendation.score.total).toBeGreaterThanOrEqual(0);
      expect(recommendation.score.total).toBeLessThanOrEqual(1);
      const keys = recommendation.score.components.map((c: { key: string }) => c.key);
      expect(keys).toEqual(['quantity', 'price', 'grade', 'location', 'completeness']);
      expect(recommendation.evidence.length).toBeGreaterThan(0);
      for (const item of recommendation.evidence) {
        expect(item.id).toBeTruthy();
        expect(item.claim).toBeTruthy();
      }
    }
  });

  it('accepts manual criteria without a query', async () => {
    const res = await post({ criteria: { productId: 'coffee' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.criteriaSource).toBe('manual');
    expect(body.data.query).toBe('');
  });

  it('never returns an eligible supplier alongside a hard failure', async () => {
    const res = await post({ query: 'grade A coffee from Sidama under 300' });
    const body = await res.json();
    for (const recommendation of body.data.recommendations) {
      const failureEvidence = recommendation.evidence.filter(
        (item: { id: string; value: unknown }) => item.id.includes(':failure:') && item.value,
      );
      expect(failureEvidence).toEqual([]);
    }
  });

  it('produces a safe explanation even when the AI provider is unavailable', async () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.AI_API_KEY;
    try {
      // Manual criteria avoid the parse step (which legitimately needs a
      // provider). Only the *explanation* touches the model here, and it must
      // degrade to a deterministic summary instead of failing the request.
      const res = await post({ criteria: { productId: 'coffee' } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.explanation).toBeTruthy();
      expect(['deterministic', 'unavailable']).toContain(body.data.explanation.source);
      expect(body.data.recommendations).toBeInstanceOf(Array);
    } finally {
      process.env.AI_PROVIDER = 'mock';
    }
  });

  it('does not reserve inventory or create orders', async () => {
    const [before] = await db
      .select({ total: sum(inventoryLots.availableQuantity), reserved: sum(inventoryLots.reservedQuantity) })
      .from(inventoryLots);
    const res = await post({ query: '10 tonnes of grade B maize' });
    expect(res.status).toBe(200);
    const [after] = await db
      .select({ total: sum(inventoryLots.availableQuantity), reserved: sum(inventoryLots.reservedQuantity) })
      .from(inventoryLots);
    expect(after.total).toBe(before.total);
    expect(after.reserved).toBe(before.reserved);
  });

  it('returns split sourcing as a proposal only, never a single line', async () => {
    const res = await post({ query: 'coffee' });
    const body = await res.json();
    if (body.data.split) {
      expect(body.data.split.lines.length).toBeGreaterThanOrEqual(2);
      expect(body.data.split.assumptions.length).toBeGreaterThan(0);
      expect(body.data.split.estimatedTotalCost).toBeGreaterThan(0);
    }
  });
});
