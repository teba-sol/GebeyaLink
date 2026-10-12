import 'server-only';

import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type {
  CooperativeDto,
  DeliveryDto,
  InventoryLotDto,
  ListingStatus,
  OrderDto,
  PaymentDto,
} from '@gebeyalink/types';
import type {
  ListCollectionCentersQuery,
  ListDeliveriesQuery,
  ListFarmersQuery,
  ListInventoryQuery,
  ListOrdersQuery,
} from '@gebeyalink/validation';

import { getProductCatalog, productName } from '@/features/marketplace/queries';
import type { PageSession } from '@/lib/session';
import { type Actor, getActiveMemberships } from '@/server/authz/guards';
import { listCollectionCenters } from '@/server/collection-centers/service';
import { listCooperatives } from '@/server/cooperatives/service';
import { db } from '@/server/db';
import { user } from '@/server/db/schema/auth';
import { collectionCenters } from '@/server/db/schema/collection-centers';
import { cooperatives } from '@/server/db/schema/cooperatives';
import { farmers } from '@/server/db/schema/farmers';
import { inventoryLots } from '@/server/db/schema/inventory';
import { marketplaceListings } from '@/server/db/schema/marketplace';
import { listDeliveries as listDeliveriesFromServer } from '@/server/deliveries/service';
import { listFarmers } from '@/server/farmers/service';
import {
  getOrder as getOrderFromServer,
  listOrders as listOrdersFromServer,
} from '@/server/orders/service';
import { listPayments } from '@/server/payments/service';

/**
 * Server-side reads for the cooperative ops console (docs/frontend-architecture.md
 * §4 Data access). Pages gate the role first, so the actor mirrors the page
 * session; services still re-check every permission. Orders/inventory reads
 * reuse the scoped services and add the display fields those DTOs omit
 * (buyer name, cooperative name, center/product/listing facets) so the UI
 * never renders a bare uuid.
 */

type OrderRowLike = OrderDto;

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role ?? null };
}

async function membershipScope(session: PageSession): Promise<string[] | null> {
  if (session.role === 'admin') return null;
  return (await getActiveMemberships(session.user.id)).map((m) => m.cooperativeId);
}

/** Order DTO + the display names the shared DTO deliberately omits. */
export type CoopOrderView = OrderDto & {
  buyerName: string | null;
  cooperativeName: string;
};

async function enrichOrders(orders: OrderRowLike[]): Promise<CoopOrderView[]> {
  if (orders.length === 0) return [];
  const buyerIds = [...new Set(orders.map((o) => o.buyerId))];
  const cooperativeIds = [...new Set(orders.map((o) => o.cooperativeId))];
  const [buyers, coops] = await Promise.all([
    buyerIds.length > 0 ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, buyerIds)) : Promise.resolve([]),
    cooperativeIds.length > 0
      ? db.select({ id: cooperatives.id, name: cooperatives.name }).from(cooperatives).where(inArray(cooperatives.id, cooperativeIds))
      : Promise.resolve([]),
  ]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const coopName = new Map(coops.map((c) => [c.id, c.name]));
  return orders.map((order) => ({
    ...order,
    buyerName: buyerName.get(order.buyerId) ?? null,
    cooperativeName: coopName.get(order.cooperativeId) ?? order.cooperativeId,
  }));
}

/** Orders across the user's cooperatives, with buyer + cooperative names. */
export async function listCoopOrders(
  session: PageSession,
  query: ListOrdersQuery,
): Promise<{ items: CoopOrderView[]; page: number; limit: number; total: number }> {
  const result = await listOrdersFromServer(asActor(session), query);
  return { ...result, items: await enrichOrders(result.items) };
}

/** One order + its full payment attempt history, for the detail screen. */
export async function getCoopOrder(
  session: PageSession,
  id: string,
): Promise<{ order: CoopOrderView; attempts: PaymentDto[] }> {
  const actor = asActor(session);
  const [order, attempts] = await Promise.all([
    getOrderFromServer(actor, id),
    listPayments(actor, id),
  ]);
  const [view] = await enrichOrders([order]);
  return { order: view, attempts };
}

type LotRow = typeof inventoryLots.$inferSelect;

/** Inventory lot + the facets the ops screen needs (product, center, listing). */
export type CoopInventoryLot = InventoryLotDto & {
  reservedQuantity: number;
  productName: string;
  collectionCenterName: string;
  collectionCenterLocation: string | null;
  listing: { id: string; pricePerUnit: number; status: ListingStatus } | null;
};

async function decorateLots(session: PageSession, lots: LotRow[]): Promise<CoopInventoryLot[]> {
  if (lots.length === 0) return [];
  const lotIds = lots.map((l) => l.id);
  const centerIds = [...new Set(lots.map((l) => l.collectionCenterId))];
  const [centers, listings, catalog] = await Promise.all([
    db
      .select({ id: collectionCenters.id, name: collectionCenters.name, location: collectionCenters.location })
      .from(collectionCenters)
      .where(inArray(collectionCenters.id, centerIds)),
    db
      .select({
        id: marketplaceListings.id,
        inventoryLotId: marketplaceListings.inventoryLotId,
        pricePerUnit: marketplaceListings.pricePerUnit,
        status: marketplaceListings.status,
      })
      .from(marketplaceListings)
      .where(and(inArray(marketplaceListings.inventoryLotId, lotIds), isNull(marketplaceListings.deletedAt))),
    getProductCatalog(session),
  ]);
  const centerByName = new Map(centers.map((c) => [c.id, c]));
  const listingByLot = new Map(listings.map((l) => [l.inventoryLotId, l]));
  return lots.map((lot) => {
    const center = centerByName.get(lot.collectionCenterId);
    const listing = listingByLot.get(lot.id);
    return {
      id: lot.id,
      cooperativeId: lot.cooperativeId,
      collectionCenterId: lot.collectionCenterId,
      productId: lot.productId,
      qualityGrade: lot.qualityGrade,
      totalQuantity: lot.totalQuantity,
      availableQuantity: lot.availableQuantity,
      reservedQuantity: lot.reservedQuantity,
      status: lot.status,
      createdAt: lot.createdAt.toISOString(),
      productName: productName(catalog, lot.productId),
      collectionCenterName: center?.name ?? '—',
      collectionCenterLocation: center?.location ?? null,
      listing: listing && listing.id
        ? { id: listing.id, pricePerUnit: listing.pricePerUnit, status: listing.status }
        : null,
    };
  });
}

/** Inventory lots across the user's cooperatives with product/center/listing facets. */
export async function listCoopInventory(
  session: PageSession,
  query: ListInventoryQuery,
): Promise<{ items: CoopInventoryLot[]; page: number; limit: number; total: number }> {
  const memberIds = await membershipScope(session);
  if (memberIds !== null && memberIds.length === 0) {
    return { items: [], page: query.page, limit: query.limit, total: 0 };
  }

  const conds: SQL[] = [isNull(inventoryLots.deletedAt)];
  if (memberIds === null) {
    if (query.cooperativeId) conds.push(eq(inventoryLots.cooperativeId, query.cooperativeId));
  } else if (query.cooperativeId && memberIds.includes(query.cooperativeId)) {
    conds.push(eq(inventoryLots.cooperativeId, query.cooperativeId));
  } else {
    conds.push(inArray(inventoryLots.cooperativeId, memberIds));
  }
  const where = and(...conds);

  const [totalRow] = await db.select({ value: count() }).from(inventoryLots).where(where);
  const rows = await db
    .select()
    .from(inventoryLots)
    .where(where)
    .orderBy(desc(inventoryLots.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    items: await decorateLots(session, rows),
    page: query.page,
    limit: query.limit,
    total: totalRow.value,
  };
}

/** The user's cooperatives (name/status) for headers and context lines. */
export async function getCoopContext(session: PageSession): Promise<CooperativeDto[]> {
  return (await listCooperatives(asActor(session), 1, 100)).items;
}

/** Collection centers visible to the user's memberships. */
export async function listCoopCenters(
  session: PageSession,
  query: ListCollectionCentersQuery,
) {
  return listCollectionCenters(asActor(session), query);
}

/** Farmers registered within the user's memberships. */
export async function listCoopFarmers(session: PageSession, query: ListFarmersQuery) {
  return listFarmers(asActor(session), query);
}

type DeliveryRowLike = DeliveryDto;

/** Delivery intake record + the display facets the DTO omits (farmer/center/product). */
export type CoopDelivery = DeliveryDto & {
  farmerName: string;
  collectionCenterName: string;
  productName: string;
};

async function decorateDeliveries(
  session: PageSession,
  deliveries: DeliveryRowLike[],
): Promise<CoopDelivery[]> {
  if (deliveries.length === 0) return [];
  const farmerIds = [...new Set(deliveries.map((d) => d.farmerId))];
  const centerIds = [...new Set(deliveries.map((d) => d.collectionCenterId))];
  const [farmerRows, centerRows, catalogue] = await Promise.all([
    db
      .select({ id: farmers.id, name: farmers.name })
      .from(farmers)
      .where(inArray(farmers.id, farmerIds)),
    db
      .select({ id: collectionCenters.id, name: collectionCenters.name })
      .from(collectionCenters)
      .where(inArray(collectionCenters.id, centerIds)),
    getProductCatalog(session),
  ]);
  const farmerBy = new Map(farmerRows.map((f) => [f.id, f.name]));
  const centerBy = new Map(centerRows.map((c) => [c.id, c.name]));

  return deliveries.map((delivery) => ({
    ...delivery,
    farmerName: farmerBy.get(delivery.farmerId) ?? 'Unknown farmer',
    collectionCenterName: centerBy.get(delivery.collectionCenterId) ?? 'Collection center',
    productName: productName(catalogue, delivery.productId),
  }));
}

/** Delivery intake records across the user's cooperatives, newest first. */
export async function listCoopDeliveries(
  session: PageSession,
  query: ListDeliveriesQuery,
): Promise<{ items: CoopDelivery[]; page: number; limit: number; total: number }> {
  const result = await listDeliveriesFromServer(asActor(session), query);
  return { ...result, items: await decorateDeliveries(session, result.items) };
}