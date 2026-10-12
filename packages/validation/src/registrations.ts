import { z } from 'zod';

/**
 * Organization self-registration — onboarding (docs/prd.md §49 Onboarding,
 * FR-003/004/005; docs/user-flows.md §3).
 *
 * A signed-in user with no platform role submits one registration. The
 * organization is created `pending`; an admin reviews and verifies.
 */

import { cooperativeSlugSchema } from './cooperatives';

const emailField = z.email().max(200).nullish();
const text = (max: number) => z.string().trim().min(1).max(max);

export const registerCooperativeSchema = z.object({
  type: z.literal('cooperative'),
  name: text(200),
  slug: cooperativeSlugSchema.optional(),
  phone: z.string().trim().max(30).nullish(),
  email: emailField,
  region: z.string().trim().max(100).nullish(),
  zone: z.string().trim().max(100).nullish(),
  district: z.string().trim().max(100).nullish(),
  address: z.string().trim().max(300).nullish(),
});

export const registerBuyerSchema = z.object({
  type: z.literal('buyer'),
  organizationName: text(200),
  businessType: z.string().trim().max(100).nullish(),
  contactPerson: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(30).nullish(),
  email: emailField,
  region: z.string().trim().max(100).nullish(),
  zone: z.string().trim().max(100).nullish(),
  district: z.string().trim().max(100).nullish(),
  address: z.string().trim().max(300).nullish(),
  category: z.string().trim().max(100).nullish(),
});

export const registerTransporterSchema = z.object({
  type: z.literal('transporter'),
  companyName: text(200),
  contactName: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(30).nullish(),
  email: emailField,
  region: z.string().trim().max(100).nullish(),
  vehicleType: z.string().trim().max(100).nullish(),
  vehiclePlate: z.string().trim().max(50).nullish(),
  capacity: z.string().trim().max(100).nullish(),
  driverName: z.string().trim().max(200).nullish(),
});

export const registerOrganizationSchema = z.discriminatedUnion('type', [
  registerCooperativeSchema,
  registerBuyerSchema,
  registerTransporterSchema,
]);

export type RegisterCooperativeInput = z.input<typeof registerCooperativeSchema>;
export type RegisterBuyerInput = z.input<typeof registerBuyerSchema>;
export type RegisterTransporterInput = z.input<typeof registerTransporterSchema>;
export type RegisterOrganizationInput = z.input<typeof registerOrganizationSchema>;
