import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { TransporterDto } from '@gebeyalink/types';
import type { RegisterTransporterInput } from '@gebeyalink/validation';

import { type Actor, requireNoRole } from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { db } from '../db';
import { transporters } from '../db/schema/transporters';

/**
 * Transporter organizations (docs/prd.md §6.5, §7.3). Registration + admin
 * approval are recorded now; the transporter login shell arrives with C6.
 */

type TransporterRow = typeof transporters.$inferSelect;

export function toTransporterDto(row: TransporterRow): TransporterDto {
  return {
    id: row.id,
    userId: row.userId,
    companyName: row.companyName,
    contactName: row.contactName,
    phone: row.phone,
    email: row.email,
    region: row.region,
    vehicleType: row.vehicleType,
    vehiclePlate: row.vehiclePlate,
    capacity: row.capacity,
    driverName: row.driverName,
    verificationStatus: row.verificationStatus,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getTransporterByUser(userId: string): Promise<TransporterDto | null> {
  const row = await db.query.transporters.findFirst({
    where: and(eq(transporters.userId, userId), isNull(transporters.deletedAt)),
  });
  return row ? toTransporterDto(row) : null;
}

export async function submitTransporterRegistration(
  actor: Actor | null,
  input: RegisterTransporterInput,
): Promise<TransporterDto> {
  const authed = requireNoRole(actor);
  try {
    const [row] = await db
      .insert(transporters)
      .values({
        userId: authed.userId,
        companyName: input.companyName,
        contactName: input.contactName ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        region: input.region ?? null,
        vehicleType: input.vehicleType ?? null,
        vehiclePlate: input.vehiclePlate ?? null,
        capacity: input.capacity ?? null,
        driverName: input.driverName ?? null,
        verificationStatus: 'pending',
      })
      .returning();
    return toTransporterDto(row);
  } catch (error) {
    const cause = error as { cause?: { code?: string }; code?: string };
    const code = cause?.cause?.code ?? cause?.code;
    if (code === '23505') {
      throw new ConflictError('you already have a transporter registration');
    }
    throw error;
  }
}
