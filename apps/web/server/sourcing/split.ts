import 'server-only';

import type { SplitLine, SplitSourcingOption, SourcingCurrency } from '@gebeyalink/types';

import type { RankableListing } from './ranking';

/**
 * Split sourcing (docs/ai-sourcing-solution-design.md §Partial fulfillment).
 *
 * When no single supplier can cover the request, deterministic code proposes a
 * combination of *real, eligible* listings. Pure function — it never reserves
 * inventory, never creates orders, and never invents stock.
 *
 * Guardrails:
 *  - Only eligible listings contribute (callers pass the filtered set).
 *  - Each contributing line must itself meet the platform MOQ, because the
 *    buyer still places one order per supplier and orders below MOQ are
 *    rejected by `server/orders/service.ts`. If a line would not be orderable
 *    standalone, the split is not proposed.
 *  - Greedy by rank order (best score first), which keeps the proposal
 *    explainable: lines appear in the same order the buyer sees suppliers.
 */

export type SplitInput = {
  ranked: RankableListing[];
  requestedQuantityKg: number | null;
  minOrderQuantityKg: number;
  currency?: SourcingCurrency;
};

const DEFAULT_ASSUMPTIONS = [
  'Each supplier would need its own order: the platform holds stock per listing, not across cooperatives.',
  'Every contributing line is at least the platform minimum order quantity, so each order can actually be placed.',
  'Combined cost is a straight sum of quantity × listed unit price — transport, handling and levies are not included.',
  'Prices are live listing values; a cooperative may change or close a listing before you order.',
];

export function buildSplitOption(input: SplitInput): SplitSourcingOption | null {
  const requested = input.requestedQuantityKg;
  if (requested == null || requested <= 0) return null;
  if (input.ranked.length === 0) return null;

  const bestSingle = input.ranked[0].availableQuantity;
  if (bestSingle >= requested) return null;

  const lines: SplitLine[] = [];
  let covered = 0;

  for (const listing of input.ranked) {
    if (covered >= requested) break;
    const remaining = requested - covered;
    const contribution = Math.min(listing.availableQuantity, remaining);
    // A line below MOQ could not be ordered on its own, so it is not proposed.
    if (contribution < input.minOrderQuantityKg) continue;
    lines.push({
      listingId: listing.listingId,
      cooperativeId: listing.cooperativeId,
      cooperativeName: listing.cooperativeName,
      quantityKg: contribution,
      pricePerKg: listing.pricePerUnit,
      estimatedCost: Math.round(contribution * listing.pricePerUnit * 1000) / 1000,
    });
    covered += contribution;
  }

  if (lines.length < 2) return null;

  const estimatedTotalCost =
    Math.round(lines.reduce((sum, line) => sum + line.estimatedCost, 0) * 1000) / 1000;

  return {
    lines,
    coveredQuantityKg: Math.round(covered * 1000) / 1000,
    requestedQuantityKg: requested,
    shortfallKg: Math.round(Math.max(0, requested - covered) * 1000) / 1000,
    estimatedTotalCost,
    currency: input.currency ?? 'ETB',
    assumptions: DEFAULT_ASSUMPTIONS,
  };
}
