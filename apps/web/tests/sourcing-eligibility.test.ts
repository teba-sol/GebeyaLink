import { describe, expect, it } from 'vitest';

import { evaluateEligibility, type EligibilityCandidate, type EligibilityRequest } from '../server/sourcing/eligibility';

/**
 * Hard eligibility rules. These are the same rules `server/orders/service.ts`
 * enforces when an order is placed, so a supplier recommended here must be
 * able to actually take the order.
 */

const MOQ = 1000;

function candidate(over: Partial<EligibilityCandidate> = {}): EligibilityCandidate {
  return {
    listingId: 'listing-1',
    listingStatus: 'active',
    cooperativeActive: true,
    productId: 'coffee',
    qualityGrade: 'A',
    availableQuantity: 5000,
    pricePerUnit: 300,
    ...over,
  };
}

function request(over: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    productId: 'coffee',
    qualityGrade: 'A',
    maxPrice: 320,
    requestedQuantityKg: 5000,
    minOrderQuantityKg: MOQ,
    productNames: { coffee: 'Coffee', maize: 'Maize' },
    ...over,
  };
}

describe('evaluateEligibility — hard rules', () => {
  it('accepts a supplier matching product, grade, price and quantity', () => {
    const outcome = evaluateEligibility(candidate(), request());
    expect(outcome.eligible).toBe(true);
    expect(outcome.failures).toEqual([]);
  });

  it('rejects an inactive listing', () => {
    const outcome = evaluateEligibility(candidate({ listingStatus: 'paused' }), request());
    expect(outcome.eligible).toBe(false);
    expect(outcome.failures.map((f) => f.code)).toContain('listing_not_active');
  });

  it('rejects an inactive cooperative', () => {
    const outcome = evaluateEligibility(candidate({ cooperativeActive: false }), request());
    expect(outcome.failures.map((f) => f.code)).toContain('cooperative_not_active');
  });

  it('rejects a product mismatch with a readable message', () => {
    const outcome = evaluateEligibility(candidate({ productId: 'maize' }), request());
    const failure = outcome.failures.find((f) => f.code === 'product_mismatch');
    expect(failure?.message).toContain('Maize');
    expect(failure?.message).toContain('Coffee');
  });

  it('rejects a grade mismatch', () => {
    const outcome = evaluateEligibility(candidate({ qualityGrade: 'B' }), request());
    expect(outcome.failures.map((f) => f.code)).toContain('grade_mismatch');
  });

  it('rejects a price above the ceiling but allows a price at the ceiling', () => {
    expect(
      evaluateEligibility(candidate({ pricePerUnit: 320.001 }), request()).failures.map((f) => f.code),
    ).toContain('above_price_ceiling');
    expect(evaluateEligibility(candidate({ pricePerUnit: 320 }), request()).eligible).toBe(true);
  });

  it('rejects insufficient quantity against the request', () => {
    const outcome = evaluateEligibility(candidate({ availableQuantity: 4999 }), request());
    expect(outcome.failures.map((f) => f.code)).toContain('insufficient_quantity');
  });

  it('rejects a lot below MOQ even when no quantity was requested', () => {
    const outcome = evaluateEligibility(
      candidate({ availableQuantity: 999 }),
      request({ requestedQuantityKg: null }),
    );
    expect(outcome.failures.map((f) => f.code)).toContain('below_minimum_order_quantity');
  });

  it('accepts a lot that only meets MOQ when no quantity was requested', () => {
    const outcome = evaluateEligibility(
      candidate({ availableQuantity: MOQ }),
      request({ requestedQuantityKg: null }),
    );
    expect(outcome.eligible).toBe(true);
  });

  it('ignores unrequested criteria (no product/grade/price set)', () => {
    const outcome = evaluateEligibility(
      candidate({ productId: 'teff', qualityGrade: 'C', pricePerUnit: 900 }),
      request({ productId: undefined, qualityGrade: undefined, maxPrice: undefined, requestedQuantityKg: null }),
    );
    expect(outcome.eligible).toBe(true);
  });

  it('reports every failure at once rather than the first', () => {
    const outcome = evaluateEligibility(
      candidate({ listingStatus: 'closed', cooperativeActive: false, availableQuantity: 10 }),
      request(),
    );
    expect(outcome.failures.length).toBeGreaterThanOrEqual(3);
  });
});
