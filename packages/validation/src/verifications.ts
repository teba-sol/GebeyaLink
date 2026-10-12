import { z } from 'zod';

/**
 * Organization verification review — admin queue (docs/prd.md §7, §42,
 * FR-006). Admin moves a registration through under_review → approved /
 * rejected, or suspends an approved organization.
 */

export const verificationStatusSchema = z.enum([
  'pending',
  'under_review',
  'approved',
  'rejected',
  'suspended',
]);

export const verificationOrgTypeSchema = z.enum(['cooperative', 'buyer', 'transporter']);

export const verificationActionSchema = z
  .object({
    action: z.enum(['under_review', 'approve', 'reject', 'suspend']),
    note: z.string().trim().max(500).nullish(),
  })
  .refine((value) => value.action !== 'reject' || (value.note?.length ?? 0) > 0, {
    message: 'a reason is required to reject',
  });

export const listVerificationsQuerySchema = z.object({
  status: verificationStatusSchema.optional(),
  type: verificationOrgTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type VerificationActionInput = z.input<typeof verificationActionSchema>;
export type ListVerificationsQuery = z.output<typeof listVerificationsQuerySchema>;
