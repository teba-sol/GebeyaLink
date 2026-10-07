import { z } from 'zod';

/** Farmer (business record) validation — C2 (docs/prd.md §8.1, docs/roles-and-permissions.md §9). */

export const farmerIdSchema = z.string().uuid();

const farmerNameSchema = z.string().trim().min(2).max(200);

export const createFarmerSchema = z.object({
  cooperativeId: farmerIdSchema,
  name: farmerNameSchema,
  phone: z.string().trim().max(30).nullish(),
  location: z.string().trim().max(300).nullish(),
  registeredAt: z.iso.datetime({ offset: true }).optional(),
});

/**
 * Standalone update schema — `cooperativeId` and `registeredAt` are immutable
 * business facts and are intentionally not accepted here.
 */
export const updateFarmerSchema = z
  .object({
    name: farmerNameSchema.optional(),
    phone: z.string().trim().max(30).nullish(),
    location: z.string().trim().max(300).nullish(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

export const listFarmersQuerySchema = z.object({
  cooperativeId: farmerIdSchema.optional(),
  search: z.string().trim().max(100).nullish(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFarmerInput = z.input<typeof createFarmerSchema>;
export type UpdateFarmerInput = z.input<typeof updateFarmerSchema>;
export type ListFarmersQuery = z.output<typeof listFarmersQuerySchema>;
