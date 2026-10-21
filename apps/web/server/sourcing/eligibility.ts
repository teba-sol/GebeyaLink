import 'server-only';

import type { DeliveryQualityGrade, EligibilityFailure, EligibilityOutcome } from '@gebeyalink/types';

/**
 * Deterministic supplier eligibility (docs/ai-sourcing-solution-design.md
 * §Eligibility). Pure function — no database, no model.
 *
 * Hard rules mirror the rules the platform enforces when an order is actually
 * placed (`server/orders/service.ts`): the listing must be active, the
 * cooperative must be active, and the buyer must be able to buy at least the
 * minimum order quantity from the lot. Product/grade/price/quantity come from
 * the buyer's explicit request.
 *
 * A supplier failing any rule is never recommended — a high preference score
 * can never override a hard failure.
 */

export type EligibilityCandidate = {
  listingId: string;
  listingStatus: string;
  cooperativeActive: boolean;
  productId: string;
  qualityGrade: DeliveryQualityGrade;
  availableQuantity: number;
  pricePerUnit: number;
};

export type EligibilityRequest = {
  productId?: string;
  qualityGrade?: DeliveryQualityGrade;
  maxPrice?: number;
  /** Total quantity the buyer needs (kg). Null when only a floor was implied. */
  requestedQuantityKg: number | null;
  minOrderQuantityKg: number;
  /** Human-readable product labels for failure messages. */
  productNames?: Record<string, string>;
};

function failure(
  code: EligibilityFailure['code'],
  message: string,
): EligibilityFailure {
  return { code, message };
}

export function evaluateEligibility(
  candidate: EligibilityCandidate,
  request: EligibilityRequest,
): EligibilityOutcome {
  const failures: EligibilityFailure[] = [];

  if (candidate.listingStatus !== 'active') {
    failures.push(
      failure('listing_not_active', 'this listing is not currently active'),
    );
  }

  if (!candidate.cooperativeActive) {
    failures.push(
      failure('cooperative_not_active', 'the supplying cooperative is not active'),
    );
  }

  if (request.productId && candidate.productId !== request.productId) {
    const wanted = request.productNames?.[request.productId] ?? request.productId;
    const got = request.productNames?.[candidate.productId] ?? candidate.productId;
    failures.push(
      failure('product_mismatch', `lists ${got}, not the requested ${wanted}`),
    );
  }

  if (request.qualityGrade && candidate.qualityGrade !== request.qualityGrade) {
    failures.push(
      failure(
        'grade_mismatch',
        `lists grade ${candidate.qualityGrade}, not grade ${request.qualityGrade}`,
      ),
    );
  }

  if (request.maxPrice != null && candidate.pricePerUnit > request.maxPrice) {
    failures.push(
      failure(
        'above_price_ceiling',
        `lists ${candidate.pricePerUnit} ETB/kg, above the ${request.maxPrice} ETB/kg limit`,
      ),
    );
  }

  const requested = request.requestedQuantityKg;
  if (requested != null && candidate.availableQuantity < requested) {
    failures.push(
      failure(
        'insufficient_quantity',
        `has ${candidate.availableQuantity} kg available, short of the ${requested} kg requested`,
      ),
    );
  }

  // The buyer cannot place an order below MOQ either, so a lot smaller than
  // the minimum is not usable regardless of the request size.
  const usableFloor = Math.max(request.minOrderQuantityKg, requested ?? 0);
  if (candidate.availableQuantity < usableFloor) {
    const detail =
      requested != null && requested >= request.minOrderQuantityKg
        ? `${candidate.availableQuantity} kg available is below the ${usableFloor} kg needed`
        : `${candidate.availableQuantity} kg available is below the ${request.minOrderQuantityKg} kg minimum order`;
    if (!failures.some((f) => f.code === 'insufficient_quantity')) {
      failures.push(failure('below_minimum_order_quantity', detail));
    }
  }

  return { eligible: failures.length === 0, failures };
}

/** Convenience predicate for callers that only need the boolean. */
export function isEligible(
  candidate: EligibilityCandidate,
  request: EligibilityRequest,
): boolean {
  return evaluateEligibility(candidate, request).eligible;
}

/** Preference order for partial matches: fewest failures, then best quantity. */
export function compareEligibilityFailures(a: EligibilityFailure[], b: EligibilityFailure[]): number {
  return a.length - b.length;
}
