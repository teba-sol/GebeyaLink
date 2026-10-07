import { z } from 'zod';

/** Cooperative (organization) validation — C1 (docs/roles-and-permissions.md §4–5). */

export const cooperativeStatusSchema = z.enum(['active', 'inactive']);

export const cooperativeSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

export const createCooperativeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: cooperativeSlugSchema.optional(),
  status: cooperativeStatusSchema.default('active'),
  phone: z.string().trim().max(30).nullish(),
  email: z.email().max(200).nullish(),
  region: z.string().trim().max(100).nullish(),
  zone: z.string().trim().max(100).nullish(),
  district: z.string().trim().max(100).nullish(),
  address: z.string().trim().max(300).nullish(),
});

export const updateCooperativeSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    status: cooperativeStatusSchema.optional(),
    phone: z.string().trim().max(30).nullish(),
    email: z.email().max(200).nullish(),
    region: z.string().trim().max(100).nullish(),
    zone: z.string().trim().max(100).nullish(),
    district: z.string().trim().max(100).nullish(),
    address: z.string().trim().max(300).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

export const listCooperativesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCooperativeInput = z.input<typeof createCooperativeSchema>;
export type UpdateCooperativeInput = z.input<typeof updateCooperativeSchema>;
export type ListCooperativesQuery = z.output<typeof listCooperativesQuerySchema>;
