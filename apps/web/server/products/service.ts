import 'server-only';

import { asc, eq } from 'drizzle-orm';
import type { ProductDto } from '@gebeyalink/types';

import { type Actor, requireRole } from '../authz/guards';
import { db } from '../db';
import { products } from '../db/schema/products';

/**
 * Products — global reference catalog (docs/prd.md §10). GET-only in C3.
 */

function toDto(row: typeof products.$inferSelect): ProductDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProducts(actor: Actor): Promise<ProductDto[]> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));
  return rows.map(toDto);
}