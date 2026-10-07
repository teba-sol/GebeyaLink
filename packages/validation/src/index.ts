/**
 * Shared Zod validation schemas.
 *
 * Note: server-side validation at the API boundary is authoritative
 * (docs/tech-stack.md §11). These schemas are the single definition
 * used by both sides.
 */

export {
  cooperativeSlugSchema,
  cooperativeStatusSchema,
  createCooperativeSchema,
  listCooperativesQuerySchema,
  updateCooperativeSchema,
} from './cooperatives';
export type {
  CreateCooperativeInput,
  ListCooperativesQuery,
  UpdateCooperativeInput,
} from './cooperatives';
export {
  createFarmerSchema,
  farmerIdSchema,
  listFarmersQuerySchema,
  updateFarmerSchema,
} from './farmers';
export type { CreateFarmerInput, ListFarmersQuery, UpdateFarmerInput } from './farmers';
