import { z } from 'zod';

/** Product (global reference catalog) validation — admin catalog management (docs/prd.md §10). */

export const productNameSchema = z.string().trim().min(2).max(120);

export const productSlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

export const createProductSchema = z.object({
  name: productNameSchema,
  slug: productSlugSchema.optional(),
  active: z.boolean().default(true),
});

/**
 * Standalone update schema. The slug is the stable primary key (inventory
 * lots reference it), so it is intentionally not accepted here.
 */
export const updateProductSchema = z
  .object({
    name: productNameSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;