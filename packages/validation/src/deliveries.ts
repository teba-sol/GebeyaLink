import { z } from 'zod';
import { DELIVERY_QUALITY_GRADES, DELIVERY_STATUSES } from '@gebeyalink/types';

import { productIdSchema, uuidSchema } from './common';

/**
 * Farmer delivery validation — C3 (docs/prd.md §8.2–8.3; docs/business-domain-model.md §13–14).
 *
 * The agent records one validated snapshot: claimed/measured, quality grade,
 * and accepted/rejected reconciliation. accepted + rejected must equal the
 * measured quantity; a REJECTED grade must carry zero accepted quantity.
 */

const quantitySchema = z.number().finite().min(0).refine((value) => Number.isInteger(value * 1000), {
  message: 'quantity must be a multiple of 0.001',
});

export const deliveryQualityGradeSchema = z.enum(DELIVERY_QUALITY_GRADES);

export const deliveryStatusSchema = z.enum(DELIVERY_STATUSES);

export const createDeliverySchema = z
  .object({
    cooperativeId: uuidSchema,
    collectionCenterId: uuidSchema,
    farmerId: uuidSchema,
    productId: productIdSchema,
    claimedQuantity: quantitySchema,
    measuredQuantity: quantitySchema,
    acceptedQuantity: quantitySchema,
    rejectedQuantity: quantitySchema,
    qualityGrade: deliveryQualityGradeSchema,
    deliveryDate: z.iso.datetime({ offset: true }).optional(),
    notes: z.string().trim().max(1000).nullish(),
  })
  .refine((input) => input.acceptedQuantity <= input.measuredQuantity, {
    message: 'accepted quantity cannot exceed the measured quantity',
    path: ['acceptedQuantity'],
  })
  .refine(
    (input) =>
      Math.abs(input.acceptedQuantity + input.rejectedQuantity - input.measuredQuantity) < 0.0003,
    {
      message: 'accepted + rejected must equal the measured quantity',
      path: ['rejectedQuantity'],
    },
  )
  .refine(
    (input) =>
      input.qualityGrade !== 'REJECTED' ||
      (input.acceptedQuantity === 0 && input.rejectedQuantity === input.measuredQuantity),
    {
      message: 'a REJECTED grade must have zero accepted quantity',
      path: ['qualityGrade'],
    },
  );

export const listDeliveriesQuerySchema = z.object({
  cooperativeId: uuidSchema.optional(),
  farmerId: uuidSchema.optional(),
  productId: productIdSchema.optional(),
  status: deliveryStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateDeliveryInput = z.input<typeof createDeliverySchema>;
export type ListDeliveriesQuery = z.output<typeof listDeliveriesQuerySchema>;