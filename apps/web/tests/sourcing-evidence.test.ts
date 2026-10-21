import { describe, expect, it } from 'vitest';

import { buildEvidence, buildSearchEvidence } from '../server/sourcing/evidence';
import type { RankableListing } from '../server/sourcing/ranking';
import { scoreListing, type RankingRequest } from '../server/sourcing/ranking';

/**
 * Evidence: every factual claim the buyer (or the model) sees must trace back
 * to a real database value or an explicit calculation. The language model is
 * only allowed to *reference* these ids — `server/ai/explain.ts` drops any
 * reference it cannot find here.
 */

function listing(over: Partial<RankableListing> = {}): RankableListing {
  return {
    listingId: 'listing-1',
    cooperativeId: 'coop-1',
    cooperativeName: 'Lume Adama Farmers Cooperative',
    availableQuantity: 5000,
    pricePerUnit: 300,
    qualityGrade: 'A',
    location: 'Adama, Oromia',
    cooperativeRegion: 'Oromia',
    centerLocation: 'Adama, Oromia',
    productId: 'coffee',
    productName: 'Coffee',
    createdAt: '2026-01-01T00:00:00.000Z',
    distanceKm: 42,
    ...over,
  };
}

const request: RankingRequest = {
  requestedQuantityKg: 5000,
  qualityGrade: 'A',
  maxPrice: 300,
  locationPreferred: true,
  locationQuery: 'Adama',
};

describe('buildEvidence', () => {
  it('builds a globally-unique id per claim, namespaced by listing', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing(),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const ids = evidence.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('listing:listing-1:'))).toBe(true);
  });

  it('cites the real availability and price values', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing(),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const availability = evidence.find((item) => item.id.endsWith(':availability'));
    const price = evidence.find((item) => item.id.endsWith(':price'));
    expect(availability?.value).toBe(5000);
    expect(availability?.source).toBe('inventory_lot');
    expect(price?.value).toBe(300);
  });

  it('marks distance as a calculation when coordinates were resolved', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing({ distanceKm: 42 }),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const distance = evidence.find((item) => item.id.endsWith(':distance'));
    expect(distance?.kind).toBe('calculation');
    expect(distance?.value).toBe(42);
  });

  it('marks distance unverified (not a fabricated number) when unknown', () => {
    const score = scoreListing(listing({ distanceKm: null }), request, 300);
    const evidence = buildEvidence({
      listing: listing({ distanceKm: null }),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const distance = evidence.find((item) => item.id.endsWith(':distance'));
    expect(distance?.value).toBeNull();
    expect(distance?.kind).toBe('rule');
  });

  it('never emits farmer or supplier contact fields', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing(),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const serialized = JSON.stringify(evidence).toLowerCase();
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('farmer_id');
  });

  it('records each eligibility failure as a rule-based evidence item', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing(),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: false,
      failures: [{ code: 'above_price_ceiling', message: 'lists 340 ETB/kg, above the 300 ETB/kg limit' }],
    });
    const failure = evidence.find((item) => item.id.includes(':failure:above_price_ceiling'));
    expect(failure?.kind).toBe('rule');
    expect(failure?.detail).toContain('340');
  });

  it('includes an inspectable score breakdown', () => {
    const score = scoreListing(listing(), request, 300);
    const evidence = buildEvidence({
      listing: listing(),
      requestedQuantityKg: 5000,
      maxPrice: 300,
      qualityGrade: 'A',
      score,
      eligible: true,
      failures: [],
    });
    const scoreEvidence = evidence.find((item) => item.id.endsWith(':score'));
    expect(scoreEvidence?.value).toBe(score.total);
    expect(String(scoreEvidence?.detail)).toContain('quantity');
  });
});

describe('buildSearchEvidence', () => {
  it('states how many candidates existed and how many passed', () => {
    const evidence = buildSearchEvidence({
      minOrderQuantityKg: 1000,
      candidateCount: 12,
      eligibleCount: 3,
      criteria: { productId: 'coffee' },
    });
    const candidates = evidence.find((item) => item.id === 'search:candidates');
    expect(candidates?.value).toBe(12);
    expect(String(candidates?.detail)).toContain('3 passed');
  });

  it('always states the platform MOQ', () => {
    const evidence = buildSearchEvidence({
      minOrderQuantityKg: 1000,
      candidateCount: 0,
      eligibleCount: 0,
      criteria: {},
    });
    expect(evidence.some((item) => item.id === 'search:moq' && item.value === 1000)).toBe(true);
  });

  it('echoes the buyer price ceiling when one was set', () => {
    const evidence = buildSearchEvidence({
      minOrderQuantityKg: 1000,
      candidateCount: 5,
      eligibleCount: 1,
      criteria: { maxPrice: 300 },
    });
    expect(evidence.some((item) => item.id === 'search:ceiling' && item.value === 300)).toBe(true);
  });
});
