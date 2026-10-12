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

export type CreateListingInput = z.input<typeof createListingSchema>;
export type UpdateListingInput = z.input<typeof updateListingSchema>;
export type ListMarketplaceQuery = z.output<typeof listMarketplaceQuerySchema>;
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type RejectOrderInput = z.output<typeof rejectOrderSchema>;
export type ListOrdersQuery = z.output<typeof listOrdersQuerySchema>;
