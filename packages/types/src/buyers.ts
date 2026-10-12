/**
 * Buyer (verified commercial organization) — registration + verification
 * (docs/prd.md §6.4, §7.2).
 *
 * A buyer profile links the platform user to their commercial organization.
 * Only an approved buyer profile may place orders.
 */

import type { VerificationStatus } from './verification';

export type BuyerDto = {
  id: string;
  userId: string;
  organizationName: string;
  businessType: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  region: string | null;
  zone: string | null;
  district: string | null;
  address: string | null;
  category: string | null;
  verificationStatus: VerificationStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};
