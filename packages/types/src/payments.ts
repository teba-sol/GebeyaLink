/**
 * Payment record types — C5 (docs/prd.md §23; docs/business-domain-model.md §30–§32).
 *
 * GebeyaLink never holds, processes, or transfers buyer funds: the buyer
 * pays the cooperative directly and the platform records payment status
 * (BR-016/BR-017). Verification is cooperative-attested (FR-027); no
 * gateway/custody exists in the MVP.
 */

export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentDto = {
  id: string;
  orderId: string;
  buyerId: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  reference: string | null;
  notes: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};
