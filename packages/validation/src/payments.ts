import { z } from 'zod';

import { priceSchema } from './marketplace';

/**
 * Payment recording schemas — C5 (docs/prd.md §23).
 *
 * The buyer attests to a direct payment made to the cooperative; the
 * platform records status only (no custody). The submitted amount must
 * equal the order's product total exactly (BR-015) — checked against the
 * order in the service layer, not here, because it depends on order data.
 */

export const submitPaymentSchema = z.object({
  amount: priceSchema,
  method: z.string().trim().min(1).max(50).optional(),
  reference: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const failPaymentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type SubmitPaymentInput = z.input<typeof submitPaymentSchema>;
export type FailPaymentInput = z.input<typeof failPaymentSchema>;
