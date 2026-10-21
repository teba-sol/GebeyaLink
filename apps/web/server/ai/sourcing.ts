import 'server-only';

import { DELIVERY_QUALITY_GRADES } from '@gebeyalink/types';
import type {
  AiClarification,
  AiSourcingCriteria,
  AiSourcingResult,
  AiSourcingWarning,
  DeliveryQualityGrade,
} from '@gebeyalink/types';
import { aiSourcingModelOutputSchema } from '@gebeyalink/validation';

import { getSourcingProvider, type SourcingProvider } from './provider';

/**
 * AI sourcing parser. Turns a buyer's natural-language request into validated
 * marketplace search criteria (docs/frontend-architecture.md,
 * docs/ai-sourcing-solution-design.md). The criteria map 1:1 onto existing
 * `listMarketplaceQuerySchema` filters — this layer never queries the database
 * and never reserves inventory.
 *
 * Requested quantity → `minAvailable` ("lots with at least this much stock on
 * hand"), which is a *search* filter, not a hold. MOQ is reported separately
 * from configured business parameters and is never hardcoded here.
 *
 * Anything the current data model cannot verify (delivery timing, organic
 * certification, total-budget-without-quantity) is surfaced as a warning or a
 * targeted clarification instead of being treated as a fact or invented.
 */

export type AiOutputErrorCode = 'invalid_output';

export class AiOutputError extends Error {
  readonly code: AiOutputErrorCode = 'invalid_output';

  constructor(message = 'the assistant returned an unusable response') {
    super(message);
    this.name = 'AiOutputError';
  }
}

const UNIT_TO_KG: Record<string, number> = {
  kg: 1,
  tonne: 1000,
  ton: 1000,
  quintal: 100,
  gram: 0.001,
};

export type ParseSourcingInput = {
  query: string;
  catalog: { id: string; name: string }[];
  minOrderQuantityKg: number;
  /** Injectable for tests; defaults to the env-selected provider. */
  provider?: SourcingProvider;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toQuantityKg(output: {
  quantityKg?: number | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
}): number | null {
  if (output.quantityKg != null) return round3(output.quantityKg);
  if (output.quantityValue != null) {
    const factor = output.quantityUnit ? (UNIT_TO_KG[output.quantityUnit] ?? 1) : 1;
    return round3(output.quantityValue * factor);
  }
  return null;
}

function matchCommodity(
  raw: string | null | undefined,
  catalog: { id: string; name: string }[],
): { productId?: string; warning?: AiSourcingWarning } {
  if (!raw) return {};
  const needle = raw.trim().toLowerCase();
  const hit = catalog.find(
    (p) => p.id.toLowerCase() === needle || p.name.toLowerCase() === needle,
  ) ?? catalog.find(
    (p) => p.id.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle),
  );
  if (!hit) {
    return {
      warning: {
        code: 'unsupported_commodity',
        message: `We don't currently list "${raw}". Showing matches for your other criteria.`,
      },
    };
  }
  return { productId: hit.id };
}

function matchGrade(raw: string | null | undefined): {
  qualityGrade?: DeliveryQualityGrade;
  warning?: AiSourcingWarning;
} {
  if (!raw) return {};
  const grade = raw.trim().toUpperCase();
  if ((DELIVERY_QUALITY_GRADES as readonly string[]).includes(grade)) {
    return { qualityGrade: grade as DeliveryQualityGrade };
  }
  return {
    warning: {
      code: 'invalid_grade',
      message: `We couldn't match quality grade "${raw}" (valid grades are A, B, C).`,
    },
  };
}

/**
 * Clarifications are questions, not errors: the search still runs with
 * whatever criteria were understood. They are limited to the fields that
 * genuinely change the outcome.
 */
function buildClarifications(input: {
  requestedQuantityKg: number | null;
  productId?: string;
  maxPrice?: number;
  totalBudget?: number | null;
  timeWindow?: string | null;
  certifications?: string[] | null;
}): AiClarification[] {
  const clarifications: AiClarification[] = [];

  if (input.requestedQuantityKg == null) {
    clarifications.push({
      code: 'missing_quantity',
      message:
        'How much do you need, and in what unit? Quantities are checked in kg (for example "5 tonnes").',
    });
  }

  if (!input.productId) {
    clarifications.push({
      code: 'missing_commodity',
      message: 'Which commodity should we source? Pick one from the catalogue.',
    });
  }

  if (input.totalBudget != null && input.requestedQuantityKg == null) {
    clarifications.push({
      code: 'total_budget_without_quantity',
      message: `You gave a total budget of ${input.totalBudget} ETB but no quantity, so we cannot convert it into a per-kg ceiling. Add a quantity, or give a maximum price per kg.`,
    });
  }

  if (input.timeWindow) {
    clarifications.push({
      code: 'unsupported_time_window',
      message: `Delivery timing ("${input.timeWindow}") is not tracked on listings yet, so it could not be applied. The cooperative confirms timing when you order.`,
    });
  }

  if (input.certifications && input.certifications.length > 0) {
    clarifications.push({
      code: 'unsupported_certification',
      message: `Certifications (${input.certifications.join(', ')}) are not recorded in the catalogue yet, so they could not be verified. Ask the cooperative directly.`,
    });
  }

  return clarifications;
}

export async function parseSourcingQuery(input: ParseSourcingInput): Promise<AiSourcingResult> {
  const provider = input.provider ?? getSourcingProvider();
  const rawOutput = await provider.extract({
    query: input.query,
    catalog: input.catalog,
    minOrderQuantityKg: input.minOrderQuantityKg,
  });

  const parsed = aiSourcingModelOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    throw new AiOutputError();
  }
  const output = parsed.data;

  const warnings: AiSourcingWarning[] = [];
  const criteria: AiSourcingCriteria = {};

  const commodity = matchCommodity(output.commodity, input.catalog);
  if (commodity.productId) criteria.productId = commodity.productId;
  if (commodity.warning) warnings.push(commodity.warning);

  const grade = matchGrade(output.qualityGrade);
  if (grade.qualityGrade) criteria.qualityGrade = grade.qualityGrade;
  if (grade.warning) warnings.push(grade.warning);

  if (output.region) criteria.location = output.region.trim();

  if (output.maxPricePerKg != null) criteria.maxPrice = output.maxPricePerKg;

  const quantity = toQuantityKg(output);
  if (quantity != null) criteria.minAvailable = quantity;

  const belowMinimum = quantity != null && quantity < input.minOrderQuantityKg;
  if (belowMinimum) {
    warnings.push({
      code: 'below_minimum_order_quantity',
      message: `The platform minimum order quantity is ${input.minOrderQuantityKg} kg, so we searched from that floor.`,
    });
  }

  const clarifications = buildClarifications({
    requestedQuantityKg: quantity,
    productId: criteria.productId,
    maxPrice: criteria.maxPrice,
    totalBudget: output.totalBudget,
    timeWindow: output.timeWindow,
    certifications: output.certifications,
  });

  return {
    query: input.query,
    criteria,
    minOrderQuantityKg: input.minOrderQuantityKg,
    warnings,
    clarifications,
  };
}
