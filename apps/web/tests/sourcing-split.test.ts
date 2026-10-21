import { describe, expect, it } from 'vitest';

import type { RankableListing } from '../server/sourcing/ranking';
import { buildSplitOption } from '../server/sourcing/split';

/**
 * Split sourcing: propose a combination of real, eligible lots when no single
 * supplier can cover the request. It must never invent stock, must respect
 * MOQ per line, and must decline rather than propose a single-supplier
 * "split" or a below-MOQ line.
 */

const MOQ = 1000;

function listing(over: Partial<RankableListing> = {}): RankableListing {
  return {
    listingId: 'listing-1',
    cooperativeId: 'coop-1',
    cooperativeName: 'Coop One',
    availableQuantity: 2000,
    pricePerUnit: 300,
    qualityGrade: 'A',
    location: 'Adama',
    cooperativeRegion: 'Oromia',
    centerLocation: 'Adama',
    productId: 'coffee',
    productName: 'Coffee',
    createdAt: '2026-01-01T00:00:00.000Z',
    distanceKm: null,
    ...over,
  };
}

describe('buildSplitOption', () => {
  it('returns null when there is no requested quantity', () => {
    expect(buildSplitOption({ ranked: [listing()], requestedQuantityKg: null, minOrderQuantityKg: MOQ })).toBeNull();
  });

  it('returns null when the request is not positive', () => {
    expect(buildSplitOption({ ranked: [listing()], requestedQuantityKg: 0, minOrderQuantityKg: MOQ })).toBeNull();
  });

  it('returns null when a single supplier already covers the whole request', () => {
    const option = buildSplitOption({
      ranked: [listing({ availableQuantity: 5000 })],
      requestedQuantityKg: 4000,
      minOrderQuantityKg: MOQ,
    });
    expect(option).toBeNull();
  });

  it('combines multiple lots to cover the shortfall, in rank order', () => {
    const option = buildSplitOption({
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 2000, pricePerUnit: 300 }),
        listing({ listingId: 'l2', availableQuantity: 2000, pricePerUnit: 320 }),
      ],
      requestedQuantityKg: 3500,
      minOrderQuantityKg: MOQ,
    });
    expect(option).not.toBeNull();
    expect(option!.lines.map((line) => line.listingId)).toEqual(['l1', 'l2']);
    expect(option!.coveredQuantityKg).toBe(3500);
    expect(option!.shortfallKg).toBe(0);
    expect(option!.lines[0].quantityKg).toBe(2000);
    expect(option!.lines[1].quantityKg).toBe(1500);
  });

  it('sums the combined cost from live listed prices', () => {
    const option = buildSplitOption({
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 2000, pricePerUnit: 300 }),
        listing({ listingId: 'l2', availableQuantity: 2000, pricePerUnit: 320 }),
      ],
      requestedQuantityKg: 3500,
      minOrderQuantityKg: MOQ,
    });
    expect(option!.estimatedTotalCost).toBe(2000 * 300 + 1500 * 320);
  });

  it('declines when only one line would be usable', () => {
    const option = buildSplitOption({
      ranked: [listing({ listingId: 'l1', availableQuantity: 2000 })],
      requestedQuantityKg: 5000,
      minOrderQuantityKg: MOQ,
    });
    expect(option).toBeNull();
  });

  it('never proposes a line below the platform MOQ', () => {
    // l1 covers most; l2 would need to contribute only 500 kg → below MOQ,
    // so it cannot be a line. With a single usable line, no split is offered.
    const option = buildSplitOption({
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 4500 }),
        listing({ listingId: 'l2', availableQuantity: 5000 }),
      ],
      requestedQuantityKg: 5000,
      minOrderQuantityKg: MOQ,
    });
    expect(option).toBeNull();
  });

  it('reports the shortfall when even combined stock falls short', () => {
    const option = buildSplitOption({
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 2000 }),
        listing({ listingId: 'l2', availableQuantity: 2000 }),
      ],
      requestedQuantityKg: 6000,
      minOrderQuantityKg: MOQ,
    });
    expect(option).not.toBeNull();
    expect(option!.coveredQuantityKg).toBe(4000);
    expect(option!.shortfallKg).toBe(2000);
  });

  it('documents its assumptions so the estimate is not mistaken for a quote', () => {
    const option = buildSplitOption({
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 2000 }),
        listing({ listingId: 'l2', availableQuantity: 2000 }),
      ],
      requestedQuantityKg: 3500,
      minOrderQuantityKg: MOQ,
    });
    expect(option!.assumptions.length).toBeGreaterThanOrEqual(3);
    expect(option!.assumptions.join(' ')).toMatch(/order/i);
  });

  it('is a proposal only — it returns data, never side effects', () => {
    // The function is pure: calling it twice yields identical results.
    const input = {
      ranked: [
        listing({ listingId: 'l1', availableQuantity: 2000 }),
        listing({ listingId: 'l2', availableQuantity: 2000 }),
      ],
      requestedQuantityKg: 3500,
      minOrderQuantityKg: MOQ,
    };
    expect(buildSplitOption(input)).toEqual(buildSplitOption(input));
  });
});
