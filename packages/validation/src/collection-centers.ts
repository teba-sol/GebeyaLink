import { z } from 'zod';

import { uuidSchema } from './common';

/** Collection center validation — C3 (docs/prd.md §9). */

export const createCollectionCenterSchema = z.object({
  cooperativeId: uuidSchema,
  name: z.string().trim().min(2).max(200),
  location: z.string().trim().max(300).nullish(),
});

export const updateCollectionCenterSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    location: z.string().trim().max(300).nullish(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

export const listCollectionCentersQuerySchema = z.object({
  cooperativeId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCollectionCenterInput = z.input<typeof createCollectionCenterSchema>;
export type UpdateCollectionCenterInput = z.input<typeof updateCollectionCenterSchema>;
export type ListCollectionCentersQuery = z.output<typeof listCollectionCentersQuerySchema>;