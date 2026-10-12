import 'server-only';

import { asc, eq } from 'drizzle-orm';
import type { CreateProductInput, UpdateProductInput } from '@gebeyalink/validation';
import type { ProductDto } from '@gebeyalink/types';

import { AuthzError, type Actor, requireRole } from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { slugify } from '../cooperatives/slug';
import { db } from '../db';
import { products } from '../db/schema/products';

/**
 * Products — global reference catalog (docs/prd.md §10). Readable across
 * roles; the catalog is managed by admins only.
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

export async function createProduct(actor: Actor, input: CreateProductInput): Promise<ProductDto> {
  requireRole(actor, 'admin');

  const slug = input.slug ?? slugify(input.name);
  try {
    const [row] = await db
      .insert(products)
      .values({
        id: slug,
        name: input.name,
        slug,
        active: input.active ?? true,
      })
      .returning();
    return toDto(row);
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause ?? error;
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
      throw new ConflictError('a product with this name already exists');
    }
    throw error;
  }
}

export async function updateProduct(
  actor: Actor,
  id: string,
  patch: UpdateProductInput,
): Promise<ProductDto> {
  requireRole(actor, 'admin');
  try {
    const [row] = await db
      .update(products)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!row) {
      throw new AuthzError('not_found', 'product not found');
    }
    return toDto(row);
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause ?? error;
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
      throw new ConflictError('a product with this name already exists');
    }
    throw error;
  }
}

export async function listProducts(actor: Actor): Promise<ProductDto[]> {
  requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent', 'buyer');
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));
  return rows.map(toDto);
}

/** Admin catalog read — includes inactive products so they can be reactivated. */
export async function listProductCatalog(actor: Actor): Promise<ProductDto[]> {
  requireRole(actor, 'admin');
  const rows = await db.select().from(products).orderBy(asc(products.name));
  return rows.map(toDto);
}