import 'server-only';

import { and, asc, eq, gte, isNull, lte, type SQL, or, ilike } from 'drizzle-orm';
import type {
  AiRecommendationResult,
  AiSourcingCriteria,
  DeliveryQualityGrade,
  EligibilityFailure,
  MarketplaceListingDto,
  SourcingCurrency,
  SplitSourcingOption,
  SupplierRecommendation,
} from '@gebeyalink/types';
import type { SourcingRecommendationInput } from '@gebeyalink/validation';

import { parseSourcingQuery } from '@/server/ai/sourcing';
import { explainRecommendations } from '@/server/ai/explain';
import { providerName } from '@/server/ai/provider';
import { requireRole, type Actor } from '@/server/authz/guards';
import { minOrderQuantityKg } from '@/server/config/business';
import { db } from '@/server/db';
import { collectionCenters } from '@/server/db/schema/collection-centers';
import { cooperatives } from '@/server/db/schema/cooperatives';
import { inventoryLots } from '@/server/db/schema/inventory';
import { marketplaceListings } from '@/server/db/schema/marketplace';
import { products } from '@/server/db/schema/products';
import { distanceKmBetween, isGeocoderEnabled } from '@/server/geo/geocoder';
import { releaseExpiredReservations } from '@/server/orders/service';

import { evaluateEligibility, type EligibilityRequest } from './eligibility';
import { buildEvidence, buildSearchEvidence } from './evidence';
import { rankListings, type RankableListing, type RankingRequest } from './ranking';
import { buildSplitOption } from './split';
import { SOURCING_ALGORITHM_VERSION } from '@gebeyalink/types';

/**
 * Sourcing recommendation orchestration (docs/ai-sourcing-solution-design.md).
 *
 * Flow: parse intent (LLM) → candidate query (real buyer-visible listings) →
 * hard eligibility (pure code) → deterministic ranking (pure code) → evidence
 * (pure code) → split sourcing (pure code) → optional LLM explanation.
 *
 * This is a *read-only* operation: it never reserves inventory and never
 * creates an order. The buyer still goes through the existing listing detail
 * page and order form, which re-check every rule transactionally.
 */

const CURRENCY: SourcingCurrency = 'ETB';

type CandidateRow = {
  listing: typeof marketplaceListings.$inferSelect;
  lot: typeof inventoryLots.$inferSelect;
  cooperative: typeof cooperatives.$inferSelect;
  center: typeof collectionCenters.$inferSelect;
  productName: string | null;
};

function criteriaFromInput(input: SourcingRecommendationInput): AiSourcingCriteria {
  if (input.criteria) {
    return {
      productId: input.criteria.productId,
      qualityGrade: input.criteria.qualityGrade,
      location: input.criteria.location,
      maxPrice: input.criteria.maxPrice,
      minAvailable: input.criteria.minAvailable,
    };
  }
  return {};
}

/**
 * Candidates are restricted to the same buyer-visible set as the marketplace
 * grid (active listing + active cooperative + live available quantity), then
 * narrowed by the buyer's explicit criteria. Location is *not* a SQL filter
 * here — proximity is a preference, scored after geocoding, so a nearby
 * supplier is never silently dropped for a text mismatch.
 */
async function fetchCandidates(criteria: AiSourcingCriteria): Promise<CandidateRow[]> {
  const conds: SQL[] = [
    isNull(marketplaceListings.deletedAt),
    eq(marketplaceListings.status, 'active'),
    isNull(cooperatives.deletedAt),
    eq(cooperatives.status, 'active'),
    isNull(inventoryLots.deletedAt),
    isNull(collectionCenters.deletedAt),
    gte(inventoryLots.availableQuantity, 0.001),
  ];

  if (criteria.productId) conds.push(eq(inventoryLots.productId, criteria.productId));
  if (criteria.qualityGrade) conds.push(eq(inventoryLots.qualityGrade, criteria.qualityGrade));
  if (criteria.maxPrice != null) conds.push(lte(marketplaceListings.pricePerUnit, criteria.maxPrice));
  if (criteria.minAvailable != null) {
    // Do not hard-filter on the requested quantity: a short lot is a useful
    // partial match / split candidate. Keep lots that can at least meet MOQ.
    conds.push(gte(inventoryLots.availableQuantity, 0.001));
  }
  if (criteria.location) {
    const pattern = `%${criteria.location}%`;
    const locationCond = or(
      ilike(collectionCenters.location, pattern),
      ilike(cooperatives.region, pattern),
      ilike(cooperatives.district, pattern),
      ilike(cooperatives.zone, pattern),
      ilike(cooperatives.address, pattern),
    );
    // Location is preferred, not required, so it is deliberately not applied
    // as a WHERE clause. (Kept for traceability of the decision.)
    void locationCond;
  }

  const rows = await db
    .select({
      listing: marketplaceListings,
      lot: inventoryLots,
      cooperative: cooperatives,
      center: collectionCenters,
      productName: products.name,
    })
    .from(marketplaceListings)
    .innerJoin(inventoryLots, eq(marketplaceListings.inventoryLotId, inventoryLots.id))
    .innerJoin(cooperatives, eq(marketplaceListings.cooperativeId, cooperatives.id))
    .innerJoin(collectionCenters, eq(inventoryLots.collectionCenterId, collectionCenters.id))
    .leftJoin(products, eq(inventoryLots.productId, products.id))
    .where(and(...conds))
    .orderBy(asc(marketplaceListings.pricePerUnit))
    .limit(50);

  return rows;
}

function toRankable(row: CandidateRow, distanceKm: number | null): RankableListing {
  return {
    listingId: row.listing.id,
    cooperativeId: row.listing.cooperativeId,
    cooperativeName: row.cooperative.name,
    availableQuantity: row.lot.availableQuantity,
    pricePerUnit: row.listing.pricePerUnit,
    qualityGrade: row.lot.qualityGrade,
    location: row.center.location,
    cooperativeRegion: row.cooperative.region,
    centerLocation: row.center.location,
    productId: row.lot.productId,
    productName: row.productName ?? row.lot.productId,
    createdAt: row.listing.createdAt.toISOString(),
    distanceKm,
  };
}

/**
 * Best-effort distance for each distinct origin text. The geocoder is cached
 * and throttled, and a failure simply leaves distance unknown.
 */
async function attachDistances(
  rows: CandidateRow[],
  originQuery: string | null,
): Promise<Map<string, number | null>> {
  const distances = new Map<string, number | null>();
  if (!originQuery || !isGeocoderEnabled()) {
    return distances;
  }
  const origins = new Set<string>();
  for (const row of rows) {
    if (row.center.location) origins.add(row.center.location);
    if (row.cooperative.region) origins.add(row.cooperative.region);
  }
  for (const origin of origins) {
    distances.set(origin, await distanceKmBetween(originQuery, origin));
  }
  return distances;
}

function bestDistanceFor(row: CandidateRow, distances: Map<string, number | null>): number | null {
  const values = [row.center.location, row.cooperative.region]
    .map((origin) => (origin ? distances.get(origin) ?? null : null))
    .filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

function toRecommendation(
  ranked: { listing: RankableListing; score: SupplierRecommendation['score'] },
  input: {
    rank: number;
    requestedQuantityKg: number | null;
    criteria: AiSourcingCriteria;
    eligible: boolean;
    failures: EligibilityFailure[];
  },
): SupplierRecommendation {
  const { listing, score } = ranked;
  const requested = input.requestedQuantityKg;
  const components = score.components;

  const reasons = components
    .filter((component) => component.status === 'scored' && component.score >= 0.6)
    .map((component) => component.reason);

  const tradeoffs: string[] = [];
  if (requested != null && listing.availableQuantity < requested) {
    tradeoffs.push(
      `Covers ${listing.availableQuantity} kg of the ${requested} kg request (${requested - listing.availableQuantity} kg short).`,
    );
  }
  if (requested != null && listing.availableQuantity >= requested && listing.availableQuantity < requested * 1.1) {
    tradeoffs.push('Stock is only marginally above the requested quantity, so it could sell out before you order.');
  }
  if (input.criteria.maxPrice != null && listing.pricePerUnit > input.criteria.maxPrice * 0.9) {
    tradeoffs.push('Price is close to the ceiling you set, leaving little headroom.');
  }
  if (input.criteria.location && listing.distanceKm == null) {
    tradeoffs.push('Distance from your preferred origin could not be verified.');
  }

  const missing: string[] = [];
  if (listing.location == null) missing.push('Collection center origin is not recorded.');
  if (listing.cooperativeRegion == null) missing.push('Cooperative region is not recorded.');
  missing.push('No delivery-timing data is tracked on listings.');
  missing.push('Certifications are not recorded in the catalogue.');

  const evidence = buildEvidence({
    listing,
    requestedQuantityKg: requested,
    maxPrice: input.criteria.maxPrice,
    qualityGrade: input.criteria.qualityGrade,
    score,
    eligible: input.eligible,
    failures: input.failures,
  });

  return {
    rank: input.rank,
    listingId: listing.listingId,
    cooperativeId: listing.cooperativeId,
    cooperativeName: listing.cooperativeName,
    inventoryLotId: '',
    collectionCenterId: '',
    productId: listing.productId,
    productName: listing.productName,
    qualityGrade: listing.qualityGrade,
    location: listing.location,
    availableQuantityKg: listing.availableQuantity,
    requestedQuantityKg: requested,
    pricePerKg: listing.pricePerUnit,
    currency: CURRENCY,
    estimatedTotal:
      requested != null ? Math.round(requested * listing.pricePerUnit * 1000) / 1000 : null,
    fulfillment: requested != null && listing.availableQuantity >= requested ? 'full' : 'partial',
    score,
    reasons,
    tradeoffs,
    missing,
    evidence,
  };
}

export async function recommendSuppliers(
  actor: Actor,
  input: SourcingRecommendationInput,
): Promise<AiRecommendationResult> {
  requireRole(actor, 'buyer');
  await releaseExpiredReservations();

  const moq = minOrderQuantityKg();

  const catalog = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));

  let criteria = criteriaFromInput(input);
  let warnings: AiRecommendationResult['warnings'] = [];
  let clarifications: AiRecommendationResult['clarifications'] = [];
  let criteriaSource: 'ai' | 'manual' = 'manual';

  if (input.query) {
    const parsed = await parseSourcingQuery({
      query: input.query,
      catalog,
      minOrderQuantityKg: moq,
    });
    criteria = { ...parsed.criteria, ...criteria };
    warnings = parsed.warnings;
    clarifications = parsed.clarifications;
    criteriaSource = 'ai';
  }

  // The requested quantity is the AI's `minAvailable`; when the buyer edited
  // criteria by hand without a quantity, no quantity is scored.
  const requestedQuantityKg = criteria.minAvailable ?? null;

  const rows = await fetchCandidates(criteria);
  const distances = await attachDistances(rows, criteria.location ?? null);

  const eligibilityRequest: EligibilityRequest = {
    productId: criteria.productId,
    qualityGrade: criteria.qualityGrade,
    maxPrice: criteria.maxPrice,
    requestedQuantityKg,
    minOrderQuantityKg: moq,
    productNames: Object.fromEntries(catalog.map((product) => [product.id, product.name])),
  };

  const rankingRequest: RankingRequest = {
    requestedQuantityKg,
    qualityGrade: criteria.qualityGrade,
    maxPrice: criteria.maxPrice,
    locationPreferred: Boolean(criteria.location),
    locationQuery: criteria.location ?? null,
  };

  const eligibleRankables: RankableListing[] = [];
  const ineligible: { rankable: RankableListing; failures: EligibilityFailure[] }[] = [];

  for (const row of rows) {
    const rankable = toRankable(row, bestDistanceFor(row, distances));
    const outcome = evaluateEligibility(
      {
        listingId: rankable.listingId,
        listingStatus: row.listing.status,
        cooperativeActive: row.cooperative.status === 'active',
        productId: rankable.productId,
        qualityGrade: rankable.qualityGrade,
        availableQuantity: rankable.availableQuantity,
        pricePerUnit: rankable.pricePerUnit,
      },
      eligibilityRequest,
    );
    if (outcome.eligible) eligibleRankables.push(rankable);
    else ineligible.push({ rankable, failures: outcome.failures });
  }

  const ranked = rankListings(eligibleRankables, rankingRequest);

  const recommendations: SupplierRecommendation[] = ranked.slice(0, 8).map((entry, index) =>
    toRecommendation(entry, {
      rank: index + 1,
      requestedQuantityKg,
      criteria,
      eligible: true,
      failures: [],
    }),
  );

  // Ineligible-but-close: fewest failures first, then best quantity.
  const partialRanked = rankListings(
    ineligible.map((entry) => entry.rankable),
    rankingRequest,
  )
    .map((entry) => ({
      entry,
      failures: ineligible.find((item) => item.rankable.listingId === entry.listing.listingId)?.failures ?? [],
    }))
    .sort((a, b) =>
      a.failures.length !== b.failures.length
        ? a.failures.length - b.failures.length
        : b.entry.listing.availableQuantity - a.entry.listing.availableQuantity,
    )
    .slice(0, 5);

  const partialMatches: SupplierRecommendation[] = partialRanked.map((item, index) =>
    toRecommendation(item.entry, {
      rank: index + 1,
      requestedQuantityKg,
      criteria,
      eligible: false,
      failures: item.failures,
    }),
  );

  const split: SplitSourcingOption | null = buildSplitOption({
    ranked: ranked.map((entry) => entry.listing),
    requestedQuantityKg,
    minOrderQuantityKg: moq,
  });

  const explanation = await explainRecommendations({
    criteria: { ...criteria, requestedQuantityKg },
    recommendations,
    partialMatches,
    split: split
      ? {
          coveredQuantityKg: split.coveredQuantityKg,
          requestedQuantityKg: split.requestedQuantityKg,
          lineCount: split.lines.length,
        }
      : null,
    requestedQuantityKg,
  });

  const searchEvidence = buildSearchEvidence({
    minOrderQuantityKg: moq,
    candidateCount: rows.length,
    eligibleCount: recommendations.length,
    criteria,
  });

  // Search-level evidence is attached to each recommendation so the client has
  // a single evidence list per supplier while ids stay globally unique.
  for (const recommendation of recommendations) {
    recommendation.evidence = [...searchEvidence, ...recommendation.evidence];
  }

  return {
    query: input.query ?? '',
    criteria,
    criteriaSource,
    minOrderQuantityKg: moq,
    warnings,
    clarifications,
    recommendations,
    partialMatches,
    split,
    explanation,
    meta: {
      algorithmVersion: SOURCING_ALGORITHM_VERSION,
      candidateCount: rows.length,
      eligibleCount: recommendations.length,
      generatedAt: new Date().toISOString(),
      provider: providerName(),
      geocoderUsed: Boolean(criteria.location) && isGeocoderEnabled(),
    },
  };
}

/** Re-exported so the route can keep response shaping in one place. */
export type { MarketplaceListingDto, DeliveryQualityGrade };
