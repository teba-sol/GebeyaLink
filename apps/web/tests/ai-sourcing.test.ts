import { sum } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PlatformRole } from '@gebeyalink/types';
import { listMarketplaceQuerySchema } from '@gebeyalink/validation';

import { AiProviderError, getSourcingProvider, type SourcingProvider } from '../server/ai/provider';
import { AiOutputError, parseSourcingQuery } from '../server/ai/sourcing';
import { db } from '../server/db';
import { inventoryLots } from '../server/db/schema/inventory';

let actorResult: { userId: string; role: PlatformRole | null } | null = {
  userId: 'ai-test-buyer',
  role: 'buyer',
};

vi.mock('../server/authz/guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server/authz/guards')>();
  return { ...actual, resolveActor: async () => actorResult };
});

import { POST as AI_PARSE_POST } from '../app/api/v1/marketplace/ai-search/parse/route';

/**
 * AI sourcing search: the parser must map natural language to the *existing*
 * marketplace search filters, validate untrusted model output with Zod, and
 * never mutate inventory. The provider is stubbed — no live model is called.
 */

const CATALOG = [
  { id: 'coffee', name: 'Coffee' },
  { id: 'maize', name: 'Maize' },
  { id: 'sesame', name: 'Sesame' },
];
const MOQ = 1000;

function stubProvider(output: unknown): SourcingProvider {
  return { name: 'stub', extract: async () => output };
}

function failingProvider(error: unknown): SourcingProvider {
  return {
    name: 'stub',
    extract: async () => {
      throw error;
    },
  };
}

describe('parseSourcingQuery (unit)', () => {
  it('extracts valid criteria from model output', async () => {
    const result = await parseSourcingQuery({
      query: 'grade A coffee from Sidama under 300',
      catalog: CATALOG,
      minOrderQuantityKg: MOQ,
      provider: stubProvider({
        commodity: 'coffee',
        qualityGrade: 'A',
        region: 'Sidama',
        maxPricePerKg: 300,
        quantityKg: 5000,
        notes: null,
      }),
    });
    expect(result.criteria).toEqual({
      productId: 'coffee',
      qualityGrade: 'A',
      location: 'Sidama',
      maxPrice: 300,
      minAvailable: 5000,
    });
    expect(result.warnings).toEqual([]);
    expect(result.minOrderQuantityKg).toBe(MOQ);
  });

  it('normalizes quantities to kg (tonnes, quintals, grams)', async () => {
    const parse = (over: Record<string, unknown>) =>
      parseSourcingQuery({
        query: 'q',
        catalog: CATALOG,
        minOrderQuantityKg: MOQ,
        provider: stubProvider({
          commodity: null,
          qualityGrade: null,
          region: null,
          maxPricePerKg: null,
          quantityKg: null,
          quantityValue: null,
          quantityUnit: null,
          notes: null,
          ...over,
        }),
      });
    expect((await parse({ quantityValue: 5, quantityUnit: 'tonne' })).criteria.minAvailable).toBe(5000);
    expect((await parse({ quantityValue: 2.5, quantityUnit: 'ton' })).criteria.minAvailable).toBe(2500);
    expect((await parse({ quantityValue: 3, quantityUnit: 'quintal' })).criteria.minAvailable).toBe(300);
    expect((await parse({ quantityValue: 1500, quantityUnit: 'kg' })).criteria.minAvailable).toBe(1500);
  });

  it('warns instead of inventing an unsupported commodity', async () => {
    const result = await parseSourcingQuery({
      query: '200 kg of quinoa',
      catalog: CATALOG,
      minOrderQuantityKg: MOQ,
      provider: stubProvider({
        commodity: 'quinoa',
        qualityGrade: null,
        region: null,
        maxPricePerKg: null,
        quantityKg: 200,
      }),
    });
    expect(result.criteria.productId).toBeUndefined();
    expect(result.criteria.minAvailable).toBe(200);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'unsupported_commodity' }),
    ]);
  });

  it('drops an invalid grade and warns', async () => {
    const result = await parseSourcingQuery({
      query: 'premium grade maize',
      catalog: CATALOG,
      minOrderQuantityKg: MOQ,
      provider: stubProvider({
        commodity: 'maize',
        qualityGrade: 'premium',
        region: null,
        maxPricePerKg: null,
      }),
    });
    expect(result.criteria.qualityGrade).toBeUndefined();
    expect(result.criteria.productId).toBe('maize');
    expect(result.warnings).toEqual([expect.objectContaining({ code: 'invalid_grade' })]);
  });

  it('returns empty criteria for a missing/ambiguous request', async () => {
    const result = await parseSourcingQuery({
      query: 'something affordable',
      catalog: CATALOG,
      minOrderQuantityKg: MOQ,
      provider: stubProvider({
        commodity: null,
        qualityGrade: null,
        region: null,
        maxPricePerKg: null,
        quantityKg: null,
      }),
    });
    expect(result.criteria).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('rejects malformed model output', async () => {
    await expect(
      parseSourcingQuery({
        query: 'grades and prices',
        catalog: CATALOG,
        minOrderQuantityKg: MOQ,
        provider: stubProvider({ commodity: 42, maxPricePerKg: 'cheap' }),
      }),
    ).rejects.toBeInstanceOf(AiOutputError);
  });

  it('propagates provider failures', async () => {
    await expect(
      parseSourcingQuery({
        query: 'coffee',
        catalog: CATALOG,
        minOrderQuantityKg: MOQ,
        provider: failingProvider(new AiProviderError('timeout', 'timed out')),
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('produces criteria the existing search schema accepts', async () => {
    const result = await parseSourcingQuery({
      query: 'grade A coffee from Sidama under 300',
      catalog: CATALOG,
      minOrderQuantityKg: MOQ,
      provider: stubProvider({
        commodity: 'coffee',
        qualityGrade: 'A',
        region: 'Sidama',
        maxPricePerKg: 300,
        quantityKg: 5000,
      }),
    });
    const parsed = listMarketplaceQuerySchema.safeParse(result.criteria);
    expect(parsed.success).toBe(true);
  });
});

describe('openai-compatible provider error handling', () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalKey = process.env.AI_API_KEY;

  afterAll(() => {
    process.env.AI_PROVIDER = originalProvider;
    if (originalKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('throws not_configured without an API key', () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.AI_API_KEY;
    expect(() => getSourcingProvider()).toThrow(AiProviderError);
    try {
      getSourcingProvider();
    } catch (error) {
      expect((error as AiProviderError).code).toBe('not_configured');
    }
  });

  it('maps an aborted request to timeout', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-key';
    const provider = getSourcingProvider();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    await expect(
      provider.extract({ query: 'coffee', catalog: CATALOG, minOrderQuantityKg: MOQ }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('maps non-JSON content to request_failed', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-key';
    const provider = getSourcingProvider();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    await expect(
      provider.extract({ query: 'coffee', catalog: CATALOG, minOrderQuantityKg: MOQ }),
    ).rejects.toMatchObject({ code: 'request_failed' });
  });
});

describe('POST /api/v1/marketplace/ai-search/parse', () => {
  beforeAll(() => {
    process.env.AI_PROVIDER = 'mock';
  });

  it('requires authentication', async () => {
    actorResult = null;
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'coffee from Sidama' }),
      }),
    );
    expect(res.status).toBe(401);
    actorResult = { userId: 'ai-test-buyer', role: 'buyer' };
  });

  it('rejects non-buyer roles', async () => {
    actorResult = { userId: 'ai-test-staff', role: 'cooperative_staff' };
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'coffee from Sidama' }),
      }),
    );
    expect(res.status).toBe(403);
    actorResult = { userId: 'ai-test-buyer', role: 'buyer' };
  });

  it('rejects a too-short query with 400', async () => {
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'a' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns validated criteria for a natural-language request', async () => {
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '5 tonnes of grade A coffee from Sidama under 300' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.criteria).toMatchObject({
      productId: 'coffee',
      qualityGrade: 'A',
      location: 'Sidama',
      maxPrice: 300,
      minAvailable: 5000,
    });
    expect(body.data.minOrderQuantityKg).toBeGreaterThan(0);
  });

  it('fails gracefully (503) when the provider is not configured', async () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.AI_API_KEY;
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'coffee from Sidama' }),
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('ai_unavailable');
    process.env.AI_PROVIDER = 'mock';
  });

  it('does not reserve inventory or create orders', async () => {
    const [before] = await db
      .select({ total: sum(inventoryLots.availableQuantity), reserved: sum(inventoryLots.reservedQuantity) })
      .from(inventoryLots);
    const res = await AI_PARSE_POST(
      new Request('http://localhost/api/v1/marketplace/ai-search/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '10 tonnes of grade B maize' }),
      }),
    );
    expect(res.status).toBe(200);
    const [after] = await db
      .select({ total: sum(inventoryLots.availableQuantity), reserved: sum(inventoryLots.reservedQuantity) })
      .from(inventoryLots);
    expect(after.total).toBe(before.total);
    expect(after.reserved).toBe(before.reserved);
  });
});
