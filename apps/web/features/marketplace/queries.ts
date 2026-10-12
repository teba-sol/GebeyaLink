import 'server-only';

import type { MarketplaceListingDto, PaginatedMarketplaceListings, ProductDto } from '@gebeyalink/types';
import type { ListMarketplaceQuery } from '@gebeyalink/validation';

import type { PageSession } from '@/lib/session';
import { type Actor } from '@/server/authz/guards';
import {
  getListing as getListingFromServer,
  listListings,
} from '@/server/marketplace/service';
import { listProducts } from '@/server/products/service';

/**
 * Server-side reads for the buyer marketplace (docs/frontend-architecture.md
 * §4 Data access). Pages gate the role first, so the actor mirrors the
 * page session — the service layer still re-checks every permission.
 */

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role ?? null };
}

export async function browseListings(
  session: PageSession,
  query: ListMarketplaceQuery,
): Promise<PaginatedMarketplaceListings> {
  return listListings(asActor(session), query);
}

export async function getListing(
  session: PageSession,
  id: string,
): Promise<MarketplaceListingDto> {
  return getListingFromServer(asActor(session), id);
}

/** Buyer-visible reference catalog for filter chips + product names. */
export async function getProductCatalog(session: PageSession): Promise<ProductDto[]> {
  return listProducts(asActor(session));
}

export function productName(catalog: ProductDto[], productId: string): string {
  return catalog.find((p) => p.id === productId)?.name ?? productId;
}