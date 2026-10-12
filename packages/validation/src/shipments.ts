import { z } from 'zod';
import { SHIPMENT_CONDITIONS } from '@gebeyalink/types';

import { priceSchema } from './marketplace';
import { uuidSchema } from './common';

/**
 * Shipment (transport + delivery) schemas — C6 (docs/prd.md §15–§18, §29).
 *
 * Transport may be arranged with a platform-registered transporter (approved
 * verification, docs/prd.md §7.3) or an external party the cooperative names.
 * A shipment can only be arranged once the order's payment is confirmed
 * (FR-028) — that rule depends on order data, so it is enforced in the
 * service layer, not here.
 */

const quantitySchema = z
  .number()
  .finite()
  .nonnegative()
  .refine((value) => Number.isInteger(value * 1000), {
    message: 'quantity must be a multiple of 0.001',
  });

export const createShipmentSchema = z.object({
  transporterId: uuidSchema.optional(),
  externalTransporterName: z.string().trim().min(1).max(200).optional(),
  externalTransporterPhone: z.string().trim().min(1).max(50).optional(),
  vehicleType: z.string().trim().min(1).max(120).optional(),
  vehiclePlate: z.string().trim().min(1).max(60).optional(),
  driverName: z.string().trim().min(1).max(160).optional(),
  pickupLocation: z.string().trim().min(1).max(300),
  destination: z.string().trim().min(1).max(300),
  transportCost: priceSchema.optional(),
  scheduledPickupAt: z.coerce.date().optional(),
  expectedDeliveryAt: z.coerce.date().optional(),
});

export const assignTransporterSchema = z.object({
  transporterId: uuidSchema.optional(),
  externalTransporterName: z.string().trim().min(1).max(200).optional(),
  externalTransporterPhone: z.string().trim().min(1).max(50).optional(),
  vehicleType: z.string().trim().min(1).max(120).optional(),
  vehiclePlate: z.string().trim().min(1).max(60).optional(),
  driverName: z.string().trim().min(1).max(160).optional(),
  scheduleNote: z.string().trim().min(1).max(300).optional(),
});

export const confirmPickupSchema = z.object({
  note: z.string().trim().min(1).max(500).optional(),
});

export const deliverShipmentSchema = z.object({
  receivedQuantity: quantitySchema.optional(),
  condition: z.enum(SHIPMENT_CONDITIONS).default('good'),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const confirmDeliverySchema = z.object({
  notes: z.string().trim().min(1).max(500).optional(),
});

export const cancelShipmentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type CreateShipmentInput = z.output<typeof createShipmentSchema>;
export type AssignTransporterInput = z.output<typeof assignTransporterSchema>;
export type ConfirmPickupInput = z.output<typeof confirmPickupSchema>;
export type DeliverShipmentInput = z.output<typeof deliverShipmentSchema>;
export type ConfirmDeliveryInput = z.output<typeof confirmDeliverySchema>;
export type CancelShipmentInput = z.output<typeof cancelShipmentSchema>;
