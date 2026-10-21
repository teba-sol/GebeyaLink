import { z } from 'zod';
import {
  DELIVERY_QUALITY_GRADES,
  LISTING_STATUSES,
  ORDER_STATUSES,
  REJECTION_REASONS,
} from '@gebeyalink/types';

import { productIdSchema, uuidSchema } from './common';

/**
 * Marketplace listings + orders — C4 (docs/prd.md §15–§18).
 *
 * The platform minimum order quantity and the cooperative response window
 * are configurable business parameters validated in the service layer, not
 * hardcoded here (docs/prd.md §15: "must not be hardcoded into business
 * logic").
 */

const quantitySchema = z.number().finite().positive().refine((value) => Number.isInteger(value * 1000), {
  message: 'quantity must be a multiple of 0.001',
});

export const priceSchema = z
  .number()
  .finite()
  .positive()
  .refine((value) => Number.isInteger(value * 1000), {
    message: 'price must be a multiple of 0.001',
  });

const quantityQuerySchema = z.coerce.number().finite().positive().refine((value) => Number.isInteger(value * 1000), {
  message: 'quantity must be a multiple of 0.001',
});

const priceQuerySchema = z.coerce.number().finite().positive().refine((value) => Number.isInteger(value * 1000), {
  message: 'price must be a multiple of 0.001',
});

export const createListingSchema = z.object({
  inventoryLotId: uuidSchema,
  pricePerUnit: priceSchema,
});

export const updateListingSchema = z
  .object({
    pricePerUnit: priceSchema.optional(),
    status: z.enum(LISTING_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

export const listMarketplaceQuerySchema = z.object({
  productId: productIdSchema.optional(),
  qualityGrade: z.enum(DELIVERY_QUALITY_GRADES).optional(),
  cooperativeId: uuidSchema.optional(),
  minAvailable: quantityQuerySchema.optional(),
  maxPrice: priceQuerySchema.optional(),
  location: z.string().trim().min(1).max(300).optional(),
  status: z.enum(LISTING_STATUSES).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const placeOrderSchema = z.object({
  listingId: uuidSchema,
  quantity: quantitySchema,
});

/**
 * Cooperative order rejection (docs/prd.md §19.2): a reason is required,
 * and "other" additionally requires a free-text explanation. Malformed
 * input → HTTP 400 (Zod), distinct from 422 business-rule failures.
 */
export const rejectOrderSchema = z
  .object({
    rejectionReason: z.enum(REJECTION_REASONS),
    explanation: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => value.rejectionReason !== 'other' || Boolean(value.explanation), {
    message: 'explanation is required when rejection reason is "other"',
    path: ['explanation'],
  });

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * AI-assisted sourcing search (buyer marketplace). `aiSearchQuerySchema`
 * guards the inbound natural-language request (length-limited); the model is
 * treated as untrusted output and re-validated independently with
 * `aiSourcingModelOutputSchema` — it never maps to a write.
 */
export const aiSearchQuerySchema = z.object({
  query: z.string().trim().min(3).max(300),
});

export const AI_QUANTITY_UNITS = ['kg', 'tonne', 'ton', 'quintal', 'gram'] as const;

export const aiSourcingModelOutputSchema = z.object({
  commodity: z.string().trim().min(1).max(80).nullish(),
  qualityGrade: z.string().trim().min(1).max(20).nullish(),
  region: z.string().trim().min(1).max(120).nullish(),
  maxPricePerKg: priceQuerySchema.nullish(),
  /** A total budget the buyer named (not a unit price) — needs a quantity. */
  totalBudget: priceQuerySchema.nullish(),
  quantityKg: quantityQuerySchema.nullish(),
  quantityValue: quantityQuerySchema.nullish(),
  quantityUnit: z.enum(AI_QUANTITY_UNITS).nullish(),
  /** Free-text timing request, e.g. "within 14 days" (unsupported by data). */
  timeWindow: z.string().trim().min(1).max(120).nullish(),
  /** Requested certifications, e.g. "organic", "fair trade" (unverifiable). */
  certifications: z.array(z.string().trim().min(1).max(60)).max(10).nullish(),
  notes: z.string().trim().max(500).nullish(),
});

/**
 * Recommendation request. `criteria` lets the buyer run a search from
 * extracted criteria they edited by hand, without re-calling the model.
 */
export const sourcingCriteriaSchema = z.object({
  productId: productIdSchema.optional(),
  qualityGrade: z.enum(DELIVERY_QUALITY_GRADES).optional(),
  location: z.string().trim().min(1).max(300).optional(),
  maxPrice: priceQuerySchema.optional(),
  minAvailable: quantityQuerySchema.optional(),
});

export const sourcingRecommendationRequestSchema = z
  .object({
    query: z.string().trim().min(3).max(300).optional(),
    criteria: sourcingCriteriaSchema.optional(),
  })
  .refine((value) => Boolean(value.query) || Boolean(value.criteria), {
    message: 'provide a natural-language query or explicit criteria',
  });

/**
 * Gemini's explanation payload — treated as untrusted input and validated
 * before use. Evidence references are additionally checked against the
 * server-generated evidence set in `server/ai/explain.ts`.
 */
export const aiExplanationModelOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  highlights: z
    .array(
      z.object({
        recommendationId: z.string().trim().min(1).max(64),
        points: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
      }),
    )
    .max(10)
    .nullish(),
  questionsToAsk: z.array(z.string().trim().min(1).max(300)).max(8).nullish(),
  risks: z.array(z.string().trim().min(1).max(300)).max(8).nullish(),
  evidenceRefs: z
    .array(
      z.object({
        recommendationId: z.string().trim().min(1).max(64),
        evidenceId: z.string().trim().min(1).max(64),
      }),
    )
    .max(40)
    .nullish(),
});

export type AiSearchInput = z.input<typeof aiSearchQuerySchema>;
export type AiSourcingModelOutput = z.output<typeof aiSourcingModelOutputSchema>;
export type SourcingCriteriaInput = z.input<typeof sourcingCriteriaSchema>;
export type SourcingRecommendationInput = z.output<typeof sourcingRecommendationRequestSchema>;
export type AiExplanationModelOutput = z.output<typeof aiExplanationModelOutputSchema>;

export type CreateListingInput = z.input<typeof createListingSchema>;
export type UpdateListingInput = z.input<typeof updateListingSchema>;
export type ListMarketplaceQuery = z.output<typeof listMarketplaceQuerySchema>;
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type RejectOrderInput = z.output<typeof rejectOrderSchema>;
export type ListOrdersQuery = z.output<typeof listOrdersQuerySchema>;
