import 'server-only';

import { DELIVERY_QUALITY_GRADES } from '@gebeyalink/types';
import type {
  AiSourcingCriteria,
  AiSourcingResult,
  AiSourcingWarning,
  DeliveryQualityGrade,
} from '@gebeyalink/types';
import { aiSourcingModelOutputSchema } from '@gebeyalink/validation';

import { getSourcingProvider, type SourcingProvider } from './provider';

/**
 * AI sourcing parser. Turns a buyer's natural-language request into validated
 * marketplace search criteria (docs/frontend-architecture.md). The criteria map
 * 1:1 onto existing `listMarketplaceQuerySchema` filters — this layer never
 * queries the database and never reserves inventory.
 *
 * Requested quantity → `minAvailable` ("lots with at least this much stock on
 * hand"), which is a *search* filter, not a hold. MOQ is reported separately
 * from configured business parameters and is never hardcoded here.
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

  return {
    query: input.query,
    criteria,
    minOrderQuantityKg: input.minOrderQuantityKg,
    warnings,
  };
}
