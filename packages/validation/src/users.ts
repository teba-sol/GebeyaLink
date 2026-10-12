import { z } from 'zod';

/** Platform user + membership administration — admin account management (docs/prd.md §6.6). */

/** The five approved MVP platform roles (docs/roles-and-permissions.md §2). */
export const platformRoleSchema = z.enum([
  'admin',
  'cooperative_staff',
  'collection_agent',
  'buyer',
  'transporter',
]);

export const userIdSchema = z.string().min(1).max(64);

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(100).nullish(),
  role: z.enum(['admin', 'cooperative_staff', 'collection_agent', 'buyer', 'transporter', 'none']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** `role: null` revokes the user's platform role (they become an unassigned account). */
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'cooperative_staff', 'collection_agent', 'buyer', 'transporter']).nullable(),
});

export const addMembershipSchema = z.object({
  cooperativeId: z.string().uuid(),
  active: z.boolean().default(true),
});

export const updateMembershipSchema = z.object({
  active: z.boolean(),
});

export type ListUsersQuery = z.output<typeof listUsersQuerySchema>;
export type UpdateUserRoleInput = z.input<typeof updateUserRoleSchema>;
export type AddMembershipInput = z.input<typeof addMembershipSchema>;
export type UpdateMembershipInput = z.input<typeof updateMembershipSchema>;