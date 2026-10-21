import 'server-only';

import type {
  EligibilityFailure,
  EvidenceRef,
  MarketplaceListingDto,
  RankingScore,
} from '@gebeyalink/types';

import type { RankableListing } from './ranking';

/**
 * Evidence construction (docs/ai-sourcing-solution-design.md §Evidence).
 *
 * Every factual claim shown to the buyer is built here from an actual
 * database value or an explicit calculation. The language model may only
 * *reference* these ids — `server/ai/explain.ts` drops any reference that is
 * not in this set, so the model cannot introduce a fact that does not exist.
 *
 * Only buyer-visible fields are emitted: no farmer identities, no prices or
 * quantities below listing granularity, no internal notes.
 */

function ref(evidence: Omit<EvidenceRef, 'kind'> & Partial<Pick<EvidenceRef, 'kind'>>): EvidenceRef {
  return { kind: 'field', ...evidence };
}

export type EvidenceContext = {
  listing: RankableListing;
  requestedQuantityKg: number | null;
  maxPrice?: number;
  qualityGrade?: string;
  score: RankingScore;
  eligible: boolean;
  failures: EligibilityFailure[];
};

/** Evidence for a single candidate row (used for both ranked and partial). */
export function buildEvidence(context: EvidenceContext): EvidenceRef[] {
  const { listing, requestedQuantityKg, maxPrice, qualityGrade, score } = context;
  const prefix = `listing:${listing.listingId}`;
  const evidence: EvidenceRef[] = [
    ref({
      id: `${prefix}:identity`,
      source: 'listing',
      field: 'marketplace_listings.id',
      claim: `${listing.productName} — grade ${listing.qualityGrade} from ${listing.cooperativeName}`,
      value: listing.listingId,
      detail: listing.location ? `Origin: ${listing.location}` : 'Origin not recorded',
    }),
    ref({
      id: `${prefix}:availability`,
      source: 'inventory_lot',
      field: 'inventory_lots.available_quantity',
      claim: 'Available quantity',
      value: listing.availableQuantity,
      detail: `${listing.availableQuantity} kg currently available${
        requestedQuantityKg != null ? ` against ${requestedQuantityKg} kg requested` : ''
      }.`,
    }),
    ref({
      id: `${prefix}:price`,
      source: 'listing',
      field: 'marketplace_listings.price_per_unit',
      claim: 'Listed unit price',
      value: listing.pricePerUnit,
      detail:
        maxPrice != null
          ? `${listing.pricePerUnit} ETB/kg against the ${maxPrice} ETB/kg ceiling.`
          : `${listing.pricePerUnit} ETB/kg (ETB per kilogram, as listed).`,
    }),
  ];

  if (qualityGrade) {
    evidence.push(
      ref({
        id: `${prefix}:grade`,
        source: 'inventory_lot',
        field: 'inventory_lots.quality_grade',
        claim: 'Quality grade match',
        value: listing.qualityGrade,
        detail: `Lists grade ${listing.qualityGrade}; you requested grade ${qualityGrade}.`,
      }),
    );
  }

  if (listing.distanceKm != null) {
    evidence.push(
      ref({
        id: `${prefix}:distance`,
        kind: 'calculation',
        source: 'collection_center',
        field: 'collection_centers.location → geocoded coordinates',
        claim: 'Distance from your preferred origin',
        value: Math.round(listing.distanceKm),
        detail: `${Math.round(listing.distanceKm)} km (great-circle estimate from geocoded origin text).`,
      }),
    );
  } else {
    evidence.push(
      ref({
        id: `${prefix}:distance`,
        kind: 'rule',
        source: 'collection_center',
        field: 'collection_centers.location',
        claim: 'Distance unverified',
        value: null,
        detail: 'No trustworthy coordinates were available for this origin, so proximity was not scored.',
      }),
    );
  }

  if (requestedQuantityKg != null) {
    const covered = Math.min(listing.availableQuantity, requestedQuantityKg);
    evidence.push(
      ref({
        id: `${prefix}:fulfillment`,
        kind: 'calculation',
        source: 'platform_rule',
        claim: context.eligible ? 'Request fully covered by this supplier' : 'Fulfillment gap',
        value: covered,
        detail: `Requested ${requestedQuantityKg} kg; this lot covers ${covered} kg${
          context.eligible ? '.' : ` (shortfall ${requestedQuantityKg - covered} kg).`
        }`,
      }),
    );
    evidence.push(
      ref({
        id: `${prefix}:estimatedTotal`,
        kind: 'calculation',
        source: 'platform_rule',
        claim: 'Estimated cost',
        value: Math.round(listing.pricePerUnit * requestedQuantityKg * 1000) / 1000,
        detail: `${requestedQuantityKg} kg × ${listing.pricePerUnit} ETB/kg — estimate only; the order form recomputes it server-side.`,
      }),
    );
  }

  for (const failure of context.failures) {
    evidence.push(
      ref({
        id: `${prefix}:failure:${failure.code}`,
        kind: 'rule',
        source: 'platform_rule',
        claim: `Eligibility rule: ${failure.code}`,
        value: failure.message,
        detail: failure.message,
      }),
    );
  }

  evidence.push(
    ref({
      id: `${prefix}:score`,
      kind: 'calculation',
      source: 'platform_rule',
      field: 'sourcing ranking v1.0.0',
      claim: 'Ranking score',
      value: score.total,
      detail: score.components
        .map((component) => `${component.key} ${Math.round(component.score * 100)}%×${component.weight}`)
        .join(', '),
    }),
  );

  return evidence;
}

/** Evidence for the whole result (not tied to one supplier). */
export function buildSearchEvidence(input: {
  minOrderQuantityKg: number;
  candidateCount: number;
  eligibleCount: number;
  criteria: { productId?: string; qualityGrade?: string; location?: string; maxPrice?: number };
}): EvidenceRef[] {
  const evidence: EvidenceRef[] = [
    ref({
      id: 'search:candidates',
      kind: 'calculation',
      source: 'platform_rule',
      claim: 'Candidate pool',
      value: input.candidateCount,
      detail: `${input.candidateCount} active listings matched the catalogue filters; ${input.eligibleCount} passed every hard rule.`,
    }),
    ref({
      id: 'search:moq',
      source: 'platform_rule',
      field: 'MIN_ORDER_QUANTITY_KG',
      claim: 'Platform minimum order quantity',
      value: input.minOrderQuantityKg,
      detail: `Orders are placed in multiples of at least ${input.minOrderQuantityKg} kg.`,
    }),
  ];

  if (input.criteria.maxPrice != null) {
    evidence.push(
      ref({
        id: 'search:ceiling',
        source: 'platform_rule',
        claim: 'Price ceiling from your request',
        value: input.criteria.maxPrice,
        detail: `${input.criteria.maxPrice} ETB/kg maximum.`,
      }),
    );
  }

  return evidence;
}

/** Reuses the marketplace DTO so buyer-visible fields stay in one place. */
export function evidenceListingId(listing: MarketplaceListingDto): string {
  return `listing:${listing.id}`;
}
