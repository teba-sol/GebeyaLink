import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { BuyerDto } from '@gebeyalink/types';
import type { RegisterBuyerInput } from '@gebeyalink/validation';
import { type Actor, requireNoRole } from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { db } from '../db';
import { buyers } from '../db/schema/buyers';

/**
 * Buyer organizations — registration + verification (docs/prd.md §6.4, §7.2).
 * A buyer user submits one registration; only an approved profile may order
 * (enforced in the orders service).
 */

type BuyerRow = typeof buyers.$inferSelect;

export function toBuyerDto(row: BuyerRow): BuyerDto {
  return {
    id: row.id,
    userId: row.userId,
    organizationName: row.organizationName,
    businessType: row.businessType,
    contactPerson: row.contactPerson,
    phone: row.phone,
    email: row.email,
    region: row.region,
    zone: row.zone,
    district: row.district,
    address: row.address,
    category: row.category,
    verificationStatus: row.verificationStatus,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getBuyerByUser(userId: string): Promise<BuyerDto | null> {
  const row = await db.query.buyers.findFirst({
    where: and(eq(buyers.userId, userId), isNull(buyers.deletedAt)),
  });
  return row ? toBuyerDto(row) : null;
}

export async function submitBuyerRegistration(
  actor: Actor | null,
  input: RegisterBuyerInput,
): Promise<BuyerDto> {
  const authed = requireNoRole(actor);
  try {
    const [row] = await db
      .insert(buyers)
      .values({
        userId: authed.userId,
        organizationName: input.organizationName,
        businessType: input.businessType ?? null,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        region: input.region ?? null,
        zone: input.zone ?? null,
        district: input.district ?? null,
        address: input.address ?? null,
        category: input.category ?? null,
        verificationStatus: 'pending',
      })
      .returning();
    return toBuyerDto(row);
  } catch (error) {
    const cause = error as { cause?: { code?: string }; code?: string };
    const code = cause?.cause?.code ?? cause?.code;
    if (code === '23505') {
      throw new ConflictError('you already have a buyer registration');
    }
    throw error;
  }
}
