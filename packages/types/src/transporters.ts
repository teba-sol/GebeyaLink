/**
 * Transporter (approved logistics provider) — registration + approval
 * (docs/prd.md §6.5, §7.3).
 *
 * A transporter profile records operator + vehicle information. A
 * transporter login shell is deferred to C6; registration and approval are
 * recorded now.
 */

import type { VerificationStatus } from './verification';

export type TransporterDto = {
  id: string;
  userId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  region: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  capacity: string | null;
  driverName: string | null;
  verificationStatus: VerificationStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};
