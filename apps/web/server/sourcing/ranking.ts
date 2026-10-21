import 'server-only';

import type {
  DeliveryQualityGrade,
  RankingScore,
  ScoreComponent,
  ScoreComponentKey,
  SupplierRecommendation,
} from '@gebeyalink/types';

import { LOCATION_DISTANCE_BANDS_KM, RANKING_WEIGHTS } from './config';

/**
 * Deterministic, explainable supplier ranking (docs/ai-sourcing-solution-
 * design.md §Ranking algorithm). Pure functions — the language model never
 * touches any number produced here.
 *
 * Each of the five components is normalized to 0..1 and multiplied by its
 * configured weight; the weighted sum is the score. A component whose input
 * data does not exist is `unknown`, scores 0, and *keeps its weight*, so
 * missing data never improves a supplier's position.
 */

export type RankableListing = {
  listingId: string;
  cooperativeId: string;
  availableQuantity: number;
  pricePerUnit: number;
  qualityGrade: DeliveryQualityGrade;
  /** Free-text origin (collection center location) as shown to buyers. */
  location: string | null;
  cooperativeName: string;
  cooperativeRegion: string | null;
  centerLocation: string | null;
  productId: string;
  productName: string;
  createdAt: string;
  /** Geocoded distance to the buyer's preferred origin, when known. */
  distanceKm: number | null;
};

export type RankingRequest = {
  requestedQuantityKg: number | null;
  qualityGrade?: DeliveryQualityGrade;
  maxPrice?: number;
  /** True when the buyer expressed a location preference. */
  locationPreferred: boolean;
  /** The origin string the buyer asked for (normalized by the geocoder). */
  locationQuery?: string | null;
};

export type RankedListing = {
  listing: RankableListing;
  score: RankingScore;
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function component(
  key: ScoreComponentKey,
  weight: number,
  score: number,
  status: ScoreComponent['status'],
  reason: string,
): ScoreComponent {
  return { key, weight, score: round(clamp01(score)), status, reason };
}

/**
 * Quantity: how much of the buyer's need this supplier covers, with a small
 * headroom bonus that stops at 1. Without a requested quantity we can only
 * verify the MOQ floor, so the component is normalized against the MOQ and
 * capped — it can never reach a perfect score without a real request.
 */
function quantityComponent(listing: RankableListing, request: RankingRequest): ScoreComponent {
  const weight = RANKING_WEIGHTS.quantity;
  const requested = request.requestedQuantityKg;
  if (requested == null) {
    return component(
      'quantity',
      weight,
      0,
      'unknown',
      'No quantity was requested, so quantity coverage could not be scored.',
    );
  }
  const coverage = clamp01(listing.availableQuantity / requested);
  return component(
    'quantity',
    weight,
    coverage,
    'scored',
    `${listing.availableQuantity} kg available against ${requested} kg requested (${Math.round(coverage * 100)}% covered).`,
  );
}

/**
 * Price: 1 when at or below the buyer's ceiling, decaying linearly above it.
 * With no ceiling, the cheapest candidate scores 1 and others scale by ratio.
 */
function priceComponent(
  listing: RankableListing,
  request: RankingRequest,
  cheapestPrice: number,
): ScoreComponent {
  const weight = RANKING_WEIGHTS.price;
  const price = listing.pricePerUnit;

  if (request.maxPrice != null) {
    const ceiling = request.maxPrice;
    const score = price <= ceiling ? 1 : clamp01(ceiling / price);
    return component(
      'price',
      weight,
      score,
      'scored',
      `${price} ETB/kg against the ${ceiling} ETB/kg ceiling.`,
    );
  }

  if (!Number.isFinite(cheapestPrice) || cheapestPrice <= 0) {
    return component('price', weight, 0, 'unknown', 'Price could not be compared.');
  }
  const score = clamp01(cheapestPrice / price);
  return component(
    'price',
    weight,
    score,
    'scored',
    `${price} ETB/kg; the cheapest matching lot is ${cheapestPrice} ETB/kg.`,
  );
}

/**
 * Grade: exact match scores 1. When the buyer did not specify a grade, the
 * component is unknown and scores 0 rather than rewarding everyone equally —
 * an unscored dimension must not inflate the total for any supplier.
 */
function gradeComponent(listing: RankableListing, request: RankingRequest): ScoreComponent {
  const weight = RANKING_WEIGHTS.grade;
  if (!request.qualityGrade) {
    return component(
      'grade',
      weight,
      0,
      'unknown',
      'No quality grade was requested, so grade match could not be scored.',
    );
  }
  const match = listing.qualityGrade === request.qualityGrade;
  return component(
    'grade',
    weight,
    match ? 1 : 0,
    'scored',
    `Lists grade ${listing.qualityGrade}; requested grade ${request.qualityGrade}.`,
  );
}

/**
 * Location: distance bands from the geocoded origin. Only scored when the
 * buyer expressed a preference *and* the geocoder returned coordinates; a
 * supplier whose origin could not be geocoded is unknown (0), never credited.
 */
export function locationScoreFor(distanceKm: number | null): number {
  if (distanceKm == null) return 0;
  const [nearest, near, mid, far] = LOCATION_DISTANCE_BANDS_KM;
  if (distanceKm <= nearest) return 1;
  if (distanceKm <= near) return 0.75;
  if (distanceKm <= mid) return 0.5;
  if (distanceKm <= far) return 0.25;
  return 0.1;
}

function locationComponent(listing: RankableListing, request: RankingRequest): ScoreComponent {
  const weight = RANKING_WEIGHTS.location;
  if (!request.locationPreferred) {
    return component(
      'location',
      weight,
      0,
      'unknown',
      'No location preference was given, so proximity was not scored.',
    );
  }
  if (listing.distanceKm == null) {
    return component(
      'location',
      weight,
      0,
      'unknown',
      `The origin "${listing.location ?? 'unknown'}" could not be located, so proximity is unverified.`,
    );
  }
  const score = locationScoreFor(listing.distanceKm);
  return component(
    'location',
    weight,
    score,
    'scored',
    `${Math.round(listing.distanceKm)} km from ${request.locationQuery ?? 'the preferred origin'}.`,
  );
}

/**
 * Completeness measures how much *verifiable* information the record carries
 * (origin text, cooperative region, product name). It never awards points for
 * missing data and never changes hard eligibility — it only breaks ties
 * between otherwise equal suppliers.
 */
function completenessComponent(listing: RankableListing): ScoreComponent {
  const weight = RANKING_WEIGHTS.completeness;
  const checks: Array<[string, boolean]> = [
    ['collection center origin', Boolean(listing.centerLocation)],
    ['cooperative region', Boolean(listing.cooperativeRegion)],
    ['product name', Boolean(listing.productName)],
    ['cooperative name', Boolean(listing.cooperativeName)],
  ];
  const present = checks.filter(([, ok]) => ok).length;
  const score = present / checks.length;
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return component(
    'completeness',
    weight,
    score,
    'scored',
    missing.length === 0
      ? 'Listing and supplier records are complete.'
      : `Missing: ${missing.join(', ')}.`,
  );
}

export function scoreListing(
  listing: RankableListing,
  request: RankingRequest,
  cheapestPrice: number,
): RankingScore {
  const components: ScoreComponent[] = [
    quantityComponent(listing, request),
    priceComponent(listing, request, cheapestPrice),
    gradeComponent(listing, request),
    locationComponent(listing, request),
    completenessComponent(listing),
  ];
  const total = round(
    components.reduce((sum, c) => sum + c.weight * c.score, 0),
  );
  return { total, components };
}

/**
 * Deterministic tie-breaks, applied only after the score: better quantity
 * coverage first, then lower price, then the older listing (stable history),
 * then listing id — so equal suppliers always order the same way.
 */
export function compareRanked(
  a: RankedListing,
  b: RankedListing,
  request: RankingRequest,
): number {
  if (b.score.total !== a.score.total) return b.score.total - a.score.total;

  const requested = request.requestedQuantityKg;
  if (requested != null) {
    const aCoverage = a.listing.availableQuantity / requested;
    const bCoverage = b.listing.availableQuantity / requested;
    if (aCoverage !== bCoverage) return bCoverage - aCoverage;
  } else if (a.listing.availableQuantity !== b.listing.availableQuantity) {
    return b.listing.availableQuantity - a.listing.availableQuantity;
  }

  if (a.listing.pricePerUnit !== b.listing.pricePerUnit) {
    return a.listing.pricePerUnit - b.listing.pricePerUnit;
  }

  const aCreated = Date.parse(a.listing.createdAt);
  const bCreated = Date.parse(b.listing.createdAt);
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.listing.listingId.localeCompare(b.listing.listingId);
}

export function rankListings(
  listings: RankableListing[],
  request: RankingRequest,
): RankedListing[] {
  const prices = listings.map((listing) => listing.pricePerUnit).filter((p) => p > 0);
  const cheapestPrice = prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
  const scored: RankedListing[] = listings.map((listing) => ({
    listing,
    score: scoreListing(listing, request, cheapestPrice),
  }));
  return scored.sort((a, b) => compareRanked(a, b, request));
}

/** Shape used by the service when building the DTO. */
export type ScoreSummary = Pick<SupplierRecommendation, 'score'>;
