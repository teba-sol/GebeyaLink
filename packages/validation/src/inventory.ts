import { z } from 'zod';

import { uuidSchema } from './common';

/** Inventory lot listing validation — C3 (docs/prd.md §12). */

export const listInventoryQuerySchema = z.object({
  cooperativeId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInventoryQuery = z.output<typeof listInventoryQuerySchema>;