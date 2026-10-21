/**
 * Deterministic sourcing recommendation engine — eligibility, ranking,
 * evidence and split sourcing (docs/ai-sourcing-solution-design.md).
 *
 * Everything in this module is computed by ordinary TypeScript from real
 * database records. A language model never produces, adjusts or overrides
 * any value defined here; the LLM only explains results that were already
 * computed (`AiExplanation`).
 */

import type { DeliveryQualityGrade } from './deliveries';
import type {
  AiClarification,
  AiSourcingCriteria,
  AiSourcingWarning,
} from './marketplace';

/** Bumped whenever scoring behaviour changes — surfaced in every response. */
export const SOURCING_ALGORITHM_VERSION = '1.0.0';

export const SOURCING_CURRENCIES = ['ETB'] as const;
export type SourcingCurrency = (typeof SOURCING_CURRENCIES)[number];

// -----------------------------------------------------------------------------
// Evidence — every buyer-facing factual claim traces to a stored fact
// -----------------------------------------------------------------------------

export const EVIDENCE_KINDS = ['field', 'calculation', 'rule'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_SOURCES = [
  'listing',
  'inventory_lot',
  'cooperative',
  'collection_center',
  'platform_rule',
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export type EvidenceRef = {
  /** Stable within one response; the AI may only reference ids that exist here. */
  id: string;
  kind: EvidenceKind;
  source: EvidenceSource;
  /** The claim as shown to the buyer, e.g. "Sufficient quantity listed". */
  claim: string;
  /** Database column or rule name the claim is derived from. */
  field?: string;
  /** The observed value (never a model-generated number). */
  value?: string | number | boolean | null;
  /** Human-readable comparison, e.g. "available 4,200 kg < requested 5,000 kg". */
  detail?: string;
};

// -----------------------------------------------------------------------------
// Eligibility — hard rules; a high preference score can never override these
// -----------------------------------------------------------------------------

export const ELIGIBILITY_FAILURE_CODES = [
  'listing_not_active',
  'cooperative_not_active',
  'product_mismatch',
  'grade_mismatch',
  'insufficient_quantity',
  'above_price_ceiling',
  'below_minimum_order_quantity',
] as const;
export type EligibilityFailureCode = (typeof ELIGIBILITY_FAILURE_CODES)[number];

export type EligibilityFailure = {
  code: EligibilityFailureCode;
  message: string;
};

export type EligibilityOutcome = {
  eligible: boolean;
  failures: EligibilityFailure[];
};

// -----------------------------------------------------------------------------
// Ranking — transparent, weighted, deterministic
// -----------------------------------------------------------------------------

export const SCORE_COMPONENT_KEYS = [
  'quantity',
  'price',
  'grade',
  'location',
  'completeness',
] as const;
export type ScoreComponentKey = (typeof SCORE_COMPONENT_KEYS)[number];

/**
 * `unknown` = the data needed to score the component does not exist. An
 * unknown component scores 0 while its weight is still counted, so missing
 * data can never improve a supplier's position.
 */
export type ScoreComponentStatus = 'scored' | 'unknown';

export type ScoreComponent = {
  key: ScoreComponentKey;
  /** Fraction of the total score this component owns (weights sum to 1). */
  weight: number;
  /** Normalized 0..1 (1 = best on this dimension). */
  score: number;
  status: ScoreComponentStatus;
  /** Plain-language explanation citing the actual values used. */
  reason: string;
};

export type RankingScore = {
  /** Weighted sum of components, 0..1, rounded to 4 decimals. */
  total: number;
  components: ScoreComponent[];
};

// -----------------------------------------------------------------------------
// Recommendation
// -----------------------------------------------------------------------------

export type SupplierRecommendation = {
  /** 1-based position among eligible suppliers (deterministic ordering). */
  rank: number;
  listingId: string;
  cooperativeId: string;
  cooperativeName: string;
  inventoryLotId: string;
  collectionCenterId: string;
  productId: string;
  productName: string;
  qualityGrade: DeliveryQualityGrade;
  location: string | null;
  availableQuantityKg: number;
  /** The quantity the buyer asked for, when one was given. */
  requestedQuantityKg: number | null;
  pricePerKg: number;
  currency: SourcingCurrency;
  /** price × requested quantity — only when a quantity was given. */
  estimatedTotal: number | null;
  /** `full` = this single supplier covers the whole request. */
  fulfillment: 'full' | 'partial';
  score: RankingScore;
  /** Positive, evidence-backed reasons this supplier is recommended. */
  reasons: string[];
  /** Trade-offs and cautions (still eligible). */
  tradeoffs: string[];
  /** Facts that are missing or unverifiable from current data. */
  missing: string[];
  evidence: EvidenceRef[];
};

export type SplitLine = {
  listingId: string;
  cooperativeId: string;
  cooperativeName: string;
  /** Quantity this listing would contribute (kg). */
  quantityKg: number;
  pricePerKg: number;
  estimatedCost: number;
};

export type SplitSourcingOption = {
  lines: SplitLine[];
  coveredQuantityKg: number;
  requestedQuantityKg: number;
  shortfallKg: number;
  estimatedTotalCost: number;
  currency: SourcingCurrency;
  /** Documented assumptions and limitations of the calculation. */
  assumptions: string[];
};

// -----------------------------------------------------------------------------
// Explanation — the only part a language model contributes
// -----------------------------------------------------------------------------

export const AI_EXPLANATION_SOURCES = ['gemini', 'deterministic', 'unavailable'] as const;
export type AiExplanationSource = (typeof AI_EXPLANATION_SOURCES)[number];

export type AiExplanationHighlight = {
  /** References SupplierRecommendation.listingId. */
  recommendationId: string;
  points: string[];
};

export type AiExplanationReference = {
  recommendationId: string;
  evidenceId: string;
};

export type AiExplanation = {
  source: AiExplanationSource;
  summary: string;
  highlights: AiExplanationHighlight[];
  /** Suggested questions the buyer should ask the supplier. */
  questionsToAsk: string[];
  risks: string[];
  /**
   * Only evidence ids that exist in the server-generated evidence set;
   * anything else is dropped before this object is returned.
   */
  references: AiExplanationReference[];
  /** Set when `source !== 'gemini'` — why no model explanation is shown. */
  note?: string;
};

// -----------------------------------------------------------------------------
// Full response
// -----------------------------------------------------------------------------

export type AiRecommendationMeta = {
  algorithmVersion: string;
  candidateCount: number;
  eligibleCount: number;
  generatedAt: string;
  /** AI provider name (`gemini:<model>`, `openai-compatible:<model>`, `mock`). */
  provider: string;
  /** Distance scoring used the geocoder; false when off/unavailable. */
  geocoderUsed: boolean;
};

export type AiRecommendationResult = {
  query: string;
  criteria: AiSourcingCriteria;
  criteriaSource: 'ai' | 'manual';
  minOrderQuantityKg: number;
  warnings: AiSourcingWarning[];
  clarifications: AiClarification[];
  /** Eligible suppliers, best first. */
  recommendations: SupplierRecommendation[];
  /** Suppliers that failed a hard rule but are close enough to explain. */
  partialMatches: SupplierRecommendation[];
  split: SplitSourcingOption | null;
  explanation: AiExplanation;
  meta: AiRecommendationMeta;
};
