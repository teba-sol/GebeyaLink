import 'server-only';

import { and, count, desc, eq, inArray, isNull, sum } from 'drizzle-orm';
import type {
  CollectionCenterDto,
  CooperativeDto,
  FarmerDto,
  OrderDto,
  OrderStatus,
  ProductDto,
  VerificationRequestDto,
} from '@gebeyalink/types';
import type { ListOrdersQuery, ListUsersQuery, ListVerificationsQuery } from '@gebeyalink/validation';

import { getProductCatalog, productName } from '@/features/marketplace/queries';
import type { CooperativeOption, PaginatedUsers } from '@/features/admin/types';
import type { PageSession } from '@/lib/session';
import { type Actor } from '@/server/authz/guards';
import { listCollectionCenters } from '@/server/collection-centers/service';
import {
  getCooperative as getCooperativeFromServer,
  listCooperatives,
} from '@/server/cooperatives/service';
import { listProductCatalog } from '@/server/products/service';
import { listUsers } from '@/server/users/service';
import {
  listVerificationQueue,
  type PaginatedVerificationRequests,
} from '@/server/verifications/service';
import { db } from '@/server/db';
import { user } from '@/server/db/schema/auth';
import { collectionCenters } from '@/server/db/schema/collection-centers';
import { cooperativeMembers } from '@/server/db/schema/cooperatives';
import { cooperatives } from '@/server/db/schema/cooperatives';
import { farmerDeliveries } from '@/server/db/schema/farmer-deliveries';
import { farmers } from '@/server/db/schema/farmers';
import { marketplaceListings } from '@/server/db/schema/marketplace';
import { orders } from '@/server/db/schema/orders';
import { payments } from '@/server/db/schema/payments';
import { listFarmers } from '@/server/farmers/service';
import { listOrders as listOrdersFromServer } from '@/server/orders/service';
import { userRoles } from '@/server/db/schema/user-roles';

/**
 * Server-side reads for the admin oversight shell (docs/frontend-architecture.md §4
 * Data access). Pages gate the role first, so the actor mirrors the page session;
 * services and direct reads derive every number from live data — nothing is
 * fabricated, and the gaps listed in the architecture doc (no /users, config or
 * metrics endpoints) are respected rather than worked around client-side.
 *
 * Admin has platform-wide scope, so these reads never filter by membership.
 */

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role ?? null };
}

/* ------------------------------------------------------------------ */
/* Cooperative registry                                                */
/* ------------------------------------------------------------------ */

export type AdminCoopRow = CooperativeDto & {
  memberCount: number;
  centerCount: number;
  farmerCount: number;
  deliveryCount: number;
  orderCount: number;
  pendingOrderCount: number;
  activeListingCount: number;
};

async function decorateCooperatives(coops: CooperativeDto[]): Promise<AdminCoopRow[]> {
  if (coops.length === 0) return [];
  const ids = coops.map((c) => c.id);

  const [members, centers, farmersRows, deliveries, orderRows, listings] = await Promise.all([
    db
      .select({ cooperativeId: cooperativeMembers.cooperativeId, value: count() })
      .from(cooperativeMembers)
      .where(and(inArray(cooperativeMembers.cooperativeId, ids), eq(cooperativeMembers.active, true)))
      .groupBy(cooperativeMembers.cooperativeId),
    db
      .select({ cooperativeId: collectionCenters.cooperativeId, value: count() })
      .from(collectionCenters)
      .where(and(inArray(collectionCenters.cooperativeId, ids), isNull(collectionCenters.deletedAt)))
      .groupBy(collectionCenters.cooperativeId),
    db
      .select({ cooperativeId: farmers.cooperativeId, value: count() })
      .from(farmers)
      .where(and(inArray(farmers.cooperativeId, ids), isNull(farmers.deletedAt)))
      .groupBy(farmers.cooperativeId),
    db
      .select({ cooperativeId: farmerDeliveries.cooperativeId, value: count() })
      .from(farmerDeliveries)
      .where(inArray(farmerDeliveries.cooperativeId, ids))
      .groupBy(farmerDeliveries.cooperativeId),
    db
      .select({
        cooperativeId: orders.cooperativeId,
        status: orders.status,
        value: count(),
      })
      .from(orders)
      .where(inArray(orders.cooperativeId, ids))
      .groupBy(orders.cooperativeId, orders.status),
    db
      .select({ cooperativeId: marketplaceListings.cooperativeId, value: count() })
      .from(marketplaceListings)
      .where(
        and(
          inArray(marketplaceListings.cooperativeId, ids),
          eq(marketplaceListings.status, 'active'),
          isNull(marketplaceListings.deletedAt),
        ),
      )
      .groupBy(marketplaceListings.cooperativeId),
  ]);

  const memberBy = new Map(members.map((r) => [r.cooperativeId, r.value]));
  const centerBy = new Map(centers.map((r) => [r.cooperativeId, r.value]));
  const farmerBy = new Map(farmersRows.map((r) => [r.cooperativeId, r.value]));
  const deliveryBy = new Map(deliveries.map((r) => [r.cooperativeId, r.value]));
  const listingBy = new Map(listings.map((r) => [r.cooperativeId, r.value]));
  const orderCountBy = new Map<string, number>();
  const pendingBy = new Map<string, number>();
  for (const row of orderRows) {
    orderCountBy.set(row.cooperativeId, (orderCountBy.get(row.cooperativeId) ?? 0) + row.value);
    if (row.status === 'PENDING') {
      pendingBy.set(row.cooperativeId, (pendingBy.get(row.cooperativeId) ?? 0) + row.value);
    }
  }

  return coops.map((coop) => ({
    ...coop,
    memberCount: memberBy.get(coop.id) ?? 0,
    centerCount: centerBy.get(coop.id) ?? 0,
    farmerCount: farmerBy.get(coop.id) ?? 0,
    deliveryCount: deliveryBy.get(coop.id) ?? 0,
    orderCount: orderCountBy.get(coop.id) ?? 0,
    pendingOrderCount: pendingBy.get(coop.id) ?? 0,
    activeListingCount: listingBy.get(coop.id) ?? 0,
  }));
}

export async function listAdminCooperatives(
  session: PageSession,
  page: number,
  limit: number,
): Promise<{ items: AdminCoopRow[]; page: number; limit: number; total: number }> {
  const result = await listCooperatives(asActor(session), page, limit);
  return { ...result, items: await decorateCooperatives(result.items) };
}

/* ------------------------------------------------------------------ */
/* Cooperative detail                                                  */
/* ------------------------------------------------------------------ */

export type AdminOrderRowLike = {
  id: string;
  productId: string;
  productName: string;
  buyerId: string;
  buyerName: string | null;
  qualityGrade: 'A' | 'B' | 'C' | 'REJECTED';
  quantity: number;
  unitPrice: number;
  productTotal: number;
  status: OrderStatus;
  createdAt: Date;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  paymentStatus: string | null;
};

export type AdminCooperativeDetail = {
  cooperative: CooperativeDto;
  centers: CollectionCenterDto[];
  farmers: FarmerDto[];
  farmerTotal: number;
  deliveryTotal: number;
  memberCount: number;
  activeListingCount: number;
  orders: AdminOrderRowLike[];
  orderTotal: number;
  confirmedRevenue: number;
};

/** Approximate payment status from attempts — CONFIRMED wins, then PENDING. */
async function loadApproximatePaymentStatuses(orderIds: string[]): Promise<Map<string, string>> {
  if (orderIds.length === 0) return new Map();
  const rows = await db
    .select({ orderId: payments.orderId, status: payments.status })
    .from(payments)
    .where(inArray(payments.orderId, orderIds));
  const statusByOrder = new Map<string, string>();
  for (const row of rows) {
    if (statusByOrder.get(row.orderId) === 'CONFIRMED') continue;
    if (row.status === 'CONFIRMED') statusByOrder.set(row.orderId, 'CONFIRMED');
    else if (row.status === 'PENDING' && !statusByOrder.has(row.orderId)) {
      statusByOrder.set(row.orderId, 'PENDING');
    }
  }
  return statusByOrder;
}

export async function getAdminCooperative(
  session: PageSession,
  id: string,
  orderPage = 1,
  orderLimit = 10,
): Promise<AdminCooperativeDetail> {
  const actor = asActor(session);
  const cooperative = await getCooperativeFromServer(actor, id);

  const [centers, farmerResult, deliveryResult, memberCount, listingCount, revenueRow, orderRows] =
    await Promise.all([
      listCollectionCenters(actor, { cooperativeId: id, page: 1, limit: 100 }),
      listFarmers(actor, { cooperativeId: id, page: 1, limit: 50 }),
      db
        .select({ value: count() })
        .from(farmerDeliveries)
        .where(eq(farmerDeliveries.cooperativeId, id)),
      db
        .select({ value: count() })
        .from(cooperativeMembers)
        .where(and(eq(cooperativeMembers.cooperativeId, id), eq(cooperativeMembers.active, true))),
      db
        .select({ value: count() })
        .from(marketplaceListings)
        .where(
          and(
            eq(marketplaceListings.cooperativeId, id),
            eq(marketplaceListings.status, 'active'),
            isNull(marketplaceListings.deletedAt),
          ),
        ),
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(and(eq(payments.status, 'CONFIRMED'), eq(orders.cooperativeId, id))),
      db
        .select()
        .from(orders)
        .where(eq(orders.cooperativeId, id))
        .orderBy(desc(orders.createdAt))
        .limit(orderLimit)
        .offset((orderPage - 1) * orderLimit),
    ]);

  const orderTotalRow = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.cooperativeId, id));

  const buyerIds = [...new Set(orderRows.map((o) => o.buyerId))];
  const [buyerRows, catalogue, paymentStatuses] = await Promise.all([
    buyerIds.length > 0
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, buyerIds))
      : Promise.resolve([] as { id: string; name: string | null }[]),
    getProductCatalog(session),
    loadApproximatePaymentStatuses(orderRows.map((o) => o.id)),
  ]);
  const buyerBy = new Map(buyerRows.map((b) => [b.id, b.name]));

  const ordersView: AdminOrderRowLike[] = orderRows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: productName(catalogue, row.productId),
    buyerId: row.buyerId,
    buyerName: buyerBy.get(row.buyerId) ?? null,
    qualityGrade: row.qualityGrade,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    productTotal: row.productTotal,
    status: row.status,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    rejectedAt: row.rejectedAt,
    paymentStatus:
      row.status === 'PAYMENT_CONFIRMED' ? 'CONFIRMED' : (paymentStatuses.get(row.id) ?? null),
  }));

  return {
    cooperative,
    centers: centers.items,
    farmers: farmerResult.items,
    farmerTotal: farmerResult.total,
    deliveryTotal: deliveryResult[0].value,
    memberCount: memberCount[0].value,
    activeListingCount: listingCount[0].value,
    orders: ordersView,
    orderTotal: orderTotalRow[0].value,
    confirmedRevenue: Number(revenueRow[0]?.value ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Members (participants read view)                                    */
/* ------------------------------------------------------------------ */

export type AdminMemberView = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  active: boolean;
};

export async function listAdminMembers(cooperativeId: string): Promise<AdminMemberView[]> {
  const rows = await db
    .select({
      userId: cooperativeMembers.userId,
      name: user.name,
      email: user.email,
      role: userRoles.role,
      active: cooperativeMembers.active,
    })
    .from(cooperativeMembers)
    .leftJoin(user, eq(cooperativeMembers.userId, user.id))
    .leftJoin(userRoles, eq(cooperativeMembers.userId, userRoles.userId))
    .where(eq(cooperativeMembers.cooperativeId, cooperativeId))
    .orderBy(desc(cooperativeMembers.active), user.name);

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role ?? null,
    active: row.active,
  }));
}

/* ------------------------------------------------------------------ */
/* Platform overview (live counts only — no fabricated metrics)        */
/* ------------------------------------------------------------------ */

export type AdminOverview = {
  cooperatives: { total: number; active: number; inactive: number };
  farmers: number;
  centers: number;
  deliveries: { total: number; acceptedKg: number };
  orders: { total: number; byStatus: Partial<Record<OrderStatus, number>> };
  confirmedRevenue: number;
  activeListings: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [coopStatusRows, farmerTotal, centerTotal, deliveryRows, acceptedSum, orderRows, revenueRow, listingTotal] =
    await Promise.all([
      db
        .select({ status: cooperatives.status, value: count() })
        .from(cooperatives)
        .where(isNull(cooperatives.deletedAt))
        .groupBy(cooperatives.status),
      db.select({ value: count() }).from(farmers).where(isNull(farmers.deletedAt)),
      db.select({ value: count() }).from(collectionCenters).where(isNull(collectionCenters.deletedAt)),
      db.select({ value: count() }).from(farmerDeliveries),
      db
        .select({ value: sum(farmerDeliveries.acceptedQuantity) })
        .from(farmerDeliveries)
        .where(eq(farmerDeliveries.status, 'ACCEPTED')),
      db.select({ status: orders.status, value: count() }).from(orders).groupBy(orders.status),
      db
        .select({ value: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.status, 'CONFIRMED')),
      db
        .select({ value: count() })
        .from(marketplaceListings)
        .where(and(eq(marketplaceListings.status, 'active'), isNull(marketplaceListings.deletedAt))),
    ]);

  let active = 0;
  let inactive = 0;
  for (const row of coopStatusRows) {
    if (row.status === 'active') active += row.value;
    else inactive += row.value;
  }

  const byStatus: Partial<Record<OrderStatus, number>> = {};
  let orderTotal = 0;
  for (const row of orderRows) {
    byStatus[row.status] = row.value;
    orderTotal += row.value;
  }

  return {
    cooperatives: { total: active + inactive, active, inactive },
    farmers: farmerTotal[0].value,
    centers: centerTotal[0].value,
    deliveries: {
      total: deliveryRows[0].value,
      acceptedKg: Number(acceptedSum[0]?.value ?? 0),
    },
    orders: { total: orderTotal, byStatus },
    confirmedRevenue: Number(revenueRow[0]?.value ?? 0),
    activeListings: listingTotal[0].value,
  };
}

/* ------------------------------------------------------------------ */
/* Platform orders read view                                           */
/* ------------------------------------------------------------------ */

export type AdminOrderView = OrderDto & {
  buyerName: string | null;
  cooperativeName: string;
  productName: string;
};

async function enrichAdminOrders(
  session: PageSession,
  orderList: OrderDto[],
): Promise<AdminOrderView[]> {
  if (orderList.length === 0) return [];
  const buyerIds = [...new Set(orderList.map((o) => o.buyerId))];
  const cooperativeIds = [...new Set(orderList.map((o) => o.cooperativeId))];
  const catalogue = await getProductCatalog(session);

  const [buyers, coops] = await Promise.all([
    buyerIds.length > 0
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, buyerIds))
      : Promise.resolve([] as { id: string; name: string | null }[]),
    cooperativeIds.length > 0
      ? db.select({ id: cooperatives.id, name: cooperatives.name }).from(cooperatives).where(inArray(cooperatives.id, cooperativeIds))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const buyerBy = new Map(buyers.map((b) => [b.id, b.name]));
  const coopBy = new Map(coops.map((c) => [c.id, c.name]));

  return orderList.map((order) => ({
    ...order,
    buyerName: buyerBy.get(order.buyerId) ?? null,
    cooperativeName: coopBy.get(order.cooperativeId) ?? order.cooperativeId,
    productName: productName(catalogue, order.productId),
  }));
}

export async function listAdminOrders(
  session: PageSession,
  query: ListOrdersQuery,
): Promise<{ items: AdminOrderView[]; page: number; limit: number; total: number }> {
  const result = await listOrdersFromServer(asActor(session), query);
  return { ...result, items: await enrichAdminOrders(session, result.items) };
}

/* ------------------------------------------------------------------ */
/* Product catalog                                                     */
/* ------------------------------------------------------------------ */

export async function listAdminProducts(session: PageSession): Promise<ProductDto[]> {
  return listProductCatalog(asActor(session));
}

/* ------------------------------------------------------------------ */
/* Platform users                                                      */
/* ------------------------------------------------------------------ */

export async function listAdminUsers(
  session: PageSession,
  query: ListUsersQuery,
): Promise<PaginatedUsers> {
  return listUsers(asActor(session), query);
}

export async function listCooperativeOptions(session: PageSession): Promise<CooperativeOption[]> {
  const result = await listCooperatives(asActor(session), 1, 100);
  return result.items.map((coop) => ({ id: coop.id, name: coop.name }));
}

/* ------------------------------------------------------------------ */
/* Organization verification queue                                     */
/* ------------------------------------------------------------------ */

export type AdminVerificationView = VerificationRequestDto;

export async function listAdminVerificationQueue(
  session: PageSession,
  query: ListVerificationsQuery,
): Promise<PaginatedVerificationRequests> {
  return listVerificationQueue(asActor(session), query);
}