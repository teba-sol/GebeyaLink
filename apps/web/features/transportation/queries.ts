import 'server-only';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type {
  DeliveryQualityGrade,
  OrderStatus,
  ShipmentDto,
  ShipmentStatus,
} from '@gebeyalink/types';

import { getProductCatalog, productName } from '@/features/marketplace/queries';
import type { PageSession } from '@/lib/session';
import { type Actor } from '@/server/authz/guards';
import { db } from '@/server/db';
import { user } from '@/server/db/schema/auth';
import { cooperatives } from '@/server/db/schema/cooperatives';
import { orders } from '@/server/db/schema/orders';
import { transporters } from '@/server/db/schema/transporters';
import {
  getShipment as getShipmentFromServer,
  getShipmentByOrder,
  listCoopShipments as listCoopShipmentsFromServer,
  listTransporterShipments as listTransporterShipmentsFromServer,
} from '@/server/transportation/service';

/**
 * Server-side reads for the transport surfaces (docs/frontend-architecture.md
 * §4). A shipment DTO carries ids; these readers join the order, product,
 * buyer, and cooperative so screens show names, not uuids.
 */

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role };
}

export type ShipmentView = ShipmentDto & {
  productName: string;
  quantity: number;
  qualityGrade: DeliveryQualityGrade;
  productTotal: number;
  orderStatus: OrderStatus;
  buyerName: string;
  cooperativeName: string;
};

async function enrich(session: PageSession, rows: ShipmentDto[]): Promise<ShipmentView[]> {
  if (rows.length === 0) return [];
  const orderIds = [...new Set(rows.map((r) => r.orderId))];
  const orderRows = await db
    .select({
      id: orders.id,
      productId: orders.productId,
      quantity: orders.quantity,
      qualityGrade: orders.qualityGrade,
      productTotal: orders.productTotal,
      buyerId: orders.buyerId,
      cooperativeId: orders.cooperativeId,
      status: orders.status,
    })
    .from(orders)
    .where(inArray(orders.id, orderIds));

  const buyerIds = [...new Set(orderRows.map((o) => o.buyerId))];
  const coopIds = [...new Set(orderRows.map((o) => o.cooperativeId))];
  const [buyers, coops, catalog] = await Promise.all([
    buyerIds.length > 0
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, buyerIds))
      : Promise.resolve([]),
    coopIds.length > 0
      ? db
          .select({ id: cooperatives.id, name: cooperatives.name })
          .from(cooperatives)
          .where(inArray(cooperatives.id, coopIds))
      : Promise.resolve([]),
    getProductCatalog(session),
  ]);

  const orderById = new Map(orderRows.map((o) => [o.id, o]));
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const coopName = new Map(coops.map((c) => [c.id, c.name]));

  return rows.map((row) => {
    const order = orderById.get(row.orderId);
    return {
      ...row,
      productName: order ? productName(catalog, order.productId) : '—',
      quantity: order?.quantity ?? 0,
      qualityGrade: order?.qualityGrade ?? 'A',
      productTotal: order?.productTotal ?? 0,
      orderStatus: order?.status ?? 'PENDING',
      buyerName: order ? (buyerName.get(order.buyerId) ?? 'Buyer') : 'Buyer',
      cooperativeName: order ? (coopName.get(order.cooperativeId) ?? 'Cooperative') : 'Cooperative',
    };
  });
}

/** The shipment for an order (or null when transport is not arranged yet). */
export async function getOrderShipment(
  session: PageSession,
  orderId: string,
): Promise<ShipmentDto | null> {
  return getShipmentByOrder(asActor(session), orderId);
}

export async function getShipmentView(
  session: PageSession,
  id: string,
): Promise<ShipmentView | null> {
  const dto = await getShipmentFromServer(asActor(session), id);
  const [view] = await enrich(session, [dto]);
  return view ?? null;
}

/** Shipments assigned to the signed-in transporter, newest first. */
export async function listTransporterShipmentsView(
  session: PageSession,
  status?: ShipmentStatus,
): Promise<ShipmentView[]> {
  const rows = await listTransporterShipmentsFromServer(asActor(session), status);
  return enrich(session, rows);
}

/** Shipments leaving the user's cooperatives, newest first. */
export async function listCoopShipmentsView(
  session: PageSession,
  status?: ShipmentStatus,
): Promise<ShipmentView[]> {
  const rows = await listCoopShipmentsFromServer(asActor(session), status);
  return enrich(session, rows);
}

export type ApprovedTransporterOption = {
  id: string;
  companyName: string;
  phone: string | null;
  region: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
};

/** Approved platform transporters a cooperative can assign to a shipment. */
export async function listApprovedTransporters(): Promise<ApprovedTransporterOption[]> {
  const rows = await db
    .select({
      id: transporters.id,
      companyName: transporters.companyName,
      phone: transporters.phone,
      region: transporters.region,
      vehicleType: transporters.vehicleType,
      vehiclePlate: transporters.vehiclePlate,
      driverName: transporters.driverName,
    })
    .from(transporters)
    .where(and(eq(transporters.verificationStatus, 'approved'), isNull(transporters.deletedAt)))
    .orderBy(desc(transporters.createdAt));
  return rows;
}
