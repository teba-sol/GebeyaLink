import { describe, expect, it } from 'vitest';

import { RANKING_WEIGHTS } from '../server/sourcing/config';
import { rankListings, scoreListing, type RankableListing, type RankingRequest } from '../server/sourcing/ranking';

/**
 * Deterministic, explainable ranking. No database, no model — pure math on
 * facts a buyer can see.
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
    distanceKm: null,
    ...over,
  };
}

function request(over: Partial<RankingRequest> = {}): RankingRequest {
  return {
    requestedQuantityKg: 5000,
    qualityGrade: 'A',
    maxPrice: 300,
    locationPreferred: false,
    locationQuery: null,
    ...over,
  };
}

describe('ranking weights', () => {
  it('sum to exactly 1 so the score is a normalized 0..1', () => {
    const total = Object.values(RANKING_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('matches the documented design (30/25/20/15/10)', () => {
    expect(RANKING_WEIGHTS).toEqual({
      quantity: 0.3,
      price: 0.25,
      grade: 0.2,
      location: 0.15,
      completeness: 0.1,
    });
  });
});

describe('scoreListing', () => {
  it('awards every scorable component for an ideal supplier, leaving only the unrequested ones at zero', () => {
    // This request gives no location preference, so proximity is `unknown`
    // (0 × 0.15) — the ideal total is 0.85, not 1. That is intentional:
    // a dimension the buyer never asked for must not be credited.
    const score = scoreListing(listing(), request(), 300);
    expect(score.total).toBeCloseTo(0.85, 6);
    const unknown = score.components.filter((c) => c.status === 'unknown');
    expect(unknown.map((c) => c.key)).toEqual(['location']);
  });

  it('reduces the score proportionally when quantity coverage is partial', () => {
    const score = scoreListing(listing({ availableQuantity: 2500 }), request(), 300);
    const quantity = score.components.find((c) => c.key === 'quantity');
    expect(quantity?.score).toBeCloseTo(0.5, 6);
    // 0.85 ideal − (0.5 lost coverage × 0.30 weight) = 0.70.
    expect(score.total).toBeCloseTo(0.7, 6);
  });

  it('scores 0 (not a bonus) on unknown components while keeping their weight', () => {
    const score = scoreListing(
      listing(),
      request({ qualityGrade: undefined, locationPreferred: false, requestedQuantityKg: null }),
      300,
    );
    const unknown = score.components.filter((c) => c.status === 'unknown');
    expect(unknown.length).toBeGreaterThanOrEqual(2);
    expect(unknown.every((c) => c.score === 0)).toBe(true);
    // Missing data cannot beat a fully-known supplier.
    const full = scoreListing(listing(), request(), 300);
    expect(score.total).toBeLessThan(full.total);
  });

  it('scores price against the ceiling and decays above it', () => {
    const atCeiling = scoreListing(listing({ pricePerUnit: 300 }), request({ maxPrice: 300 }), 300);
    const aboveCeiling = scoreListing(listing({ pricePerUnit: 340 }), request({ maxPrice: 300 }), 300);
    const at = atCeiling.components.find((c) => c.key === 'price');
    const above = aboveCeiling.components.find((c) => c.key === 'price');
    expect(at?.score).toBe(1);
    expect(above?.score).toBeLessThan(1);
  });

  it('scores price by relative cheapest when no ceiling was given', () => {
    const cheapest = scoreListing(listing({ pricePerUnit: 100 }), request({ maxPrice: undefined }), 100);
    const pricier = scoreListing(listing({ pricePerUnit: 200 }), request({ maxPrice: undefined }), 100);
    expect(cheapest.components.find((c) => c.key === 'price')?.score).toBe(1);
    expect(pricier.components.find((c) => c.key === 'price')?.score).toBeCloseTo(0.5, 6);
  });

  it('scores location by distance band only when the buyer asked for a location', () => {
    const notAsked = scoreListing(listing({ distanceKm: 10 }), request({ locationPreferred: false }), 300);
    expect(notAsked.components.find((c) => c.key === 'location')?.status).toBe('unknown');

    const asked = scoreListing(
      listing({ distanceKm: 30 }),
      request({ locationPreferred: true, locationQuery: 'Adama' }),
      300,
    );
    expect(asked.components.find((c) => c.key === 'location')?.score).toBe(1);
  });

  it('never credits an ungeocodable origin', () => {
    const score = scoreListing(
      listing({ distanceKm: null }),
      request({ locationPreferred: true, locationQuery: 'Nowhere' }),
      300,
    );
    const location = score.components.find((c) => c.key === 'location');
    expect(location?.status).toBe('unknown');
    expect(location?.score).toBe(0);
    expect(location?.reason).toContain('unverified');
  });

  it('reports a reason citing the actual values for every component', () => {
    const score = scoreListing(listing(), request(), 300);
    for (const component of score.components) {
      expect(component.reason.length).toBeGreaterThan(0);
      expect(component.weight).toBe(RANKING_WEIGHTS[component.key]);
    }
  });

  it('penalizes missing record data through completeness, without awarding it', () => {
    const sparse = scoreListing(
      listing({ centerLocation: null, cooperativeRegion: null, productName: '', cooperativeName: '' }),
      request(),
      300,
    );
    const completeness = sparse.components.find((c) => c.key === 'completeness');
    expect(completeness?.score).toBe(0);
    expect(completeness?.reason).toContain('Missing:');
  });
});

describe('rankListings — ordering and determinism', () => {
  it('orders by score, best first', () => {
    const ranked = rankListings(
      [
        listing({ listingId: 'worse', availableQuantity: 2500 }),
        listing({ listingId: 'best', availableQuantity: 5000 }),
      ],
      request(),
    );
    expect(ranked[0].listing.listingId).toBe('best');
  });

  it('breaks ties deterministically by coverage, then price, then age, then id', () => {
    // Identical scores except for price → cheaper wins.
    const byPrice = rankListings(
      [
        listing({ listingId: 'expensive', pricePerUnit: 310, availableQuantity: 6000 }),
        listing({ listingId: 'cheap', pricePerUnit: 300, availableQuantity: 6000 }),
      ],
      request({ maxPrice: 400 }),
    );
    expect(byPrice[0].listing.listingId).toBe('cheap');

    // Truly identical rows → oldest listing, then id, decide.
    const identical = rankListings(
      [
        listing({ listingId: 'b', createdAt: '2026-02-01T00:00:00.000Z' }),
        listing({ listingId: 'a', createdAt: '2026-01-01T00:00:00.000Z' }),
      ],
      request(),
    );
    expect(identical.map((entry) => entry.listing.listingId)).toEqual(['a', 'b']);
  });

  it('is stable across repeated runs with identical input', () => {
    const listings = [
      listing({ listingId: 'l1' }),
      listing({ listingId: 'l2', availableQuantity: 4200 }),
      listing({ listingId: 'l3', pricePerUnit: 280 }),
    ];
    const first = rankListings(listings, request()).map((entry) => entry.listing.listingId);
    const second = rankListings([...listings].reverse(), request()).map((entry) => entry.listing.listingId);
    expect(first).toEqual(second);
  });

  it('prefers the exact match when a cheaper supplier misses the grade', () => {
    // A cheaper lot that fails the grade scores lower on the 0.20 grade
    // component than the exact-match lot, so it cannot buy its way to the top.
    const ranked = rankListings(
      [
        listing({ listingId: 'exact', qualityGrade: 'A', pricePerUnit: 300 }),
        listing({ listingId: 'cheaper-wrong-grade', qualityGrade: 'B', pricePerUnit: 250 }),
      ],
      request({ qualityGrade: 'A', maxPrice: 300 }),
    );
    expect(ranked[0].listing.listingId).toBe('exact');
  });
});
