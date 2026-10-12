/**
 * Organization verification — registration + admin review (docs/prd.md §7,
 * §49 Onboarding; docs/user-flows.md §3).
 *
 * Cooperatives, buyers and transporters are verified organizations. A
 * registration starts `pending`; an admin moves it through
 * `under_review` → `approved` / `rejected`, or `suspended` once approved.
 * Only approved cooperatives may publish inventory; only approved buyers
 * may place orders (docs/prd.md §7.1–7.2).
 */

export const VERIFICATION_STATUSES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'suspended',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** The organization kinds an admin verifies. */
export const VERIFICATION_ORG_TYPES = ['cooperative', 'buyer', 'transporter'] as const;
export type VerificationOrgType = (typeof VERIFICATION_ORG_TYPES)[number];

/** A queue row describing one organization awaiting/under review. */
export type VerificationRequestDto = {
  id: string;
  type: VerificationOrgType;
  name: string;
  status: VerificationStatus;
  reviewNote: string | null;
  submittedByUserId: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  region: string | null;
  submittedAt: string;
};
