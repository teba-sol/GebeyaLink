import 'server-only';

import { and, inArray, isNull } from 'drizzle-orm';
import type {
  CollectionCenterDto,
  DeliveryDto,
  FarmerDto,
  ProductDto,
} from '@gebeyalink/types';
import type {
  ListCollectionCentersQuery,
  ListDeliveriesQuery,
  ListFarmersQuery,
} from '@gebeyalink/validation';

import { getProductCatalog, productName } from '@/features/marketplace/queries';
import type { PageSession } from '@/lib/session';
import { getActiveMemberships, type Actor } from '@/server/authz/guards';
import { listCollectionCenters } from '@/server/collection-centers/service';
import { db } from '@/server/db';
import { user } from '@/server/db/schema/auth';
import { collectionCenters } from '@/server/db/schema/collection-centers';
import { cooperatives } from '@/server/db/schema/cooperatives';
import { farmers } from '@/server/db/schema/farmers';
import {
  getDelivery as getDeliveryFromServer,
  listDeliveries as listDeliveriesFromServer,
} from '@/server/deliveries/service';
import { listFarmers } from '@/server/farmers/service';

/**
 * Server-side reads for the collection agent touch shell
 * (docs/frontend-architecture.md §4 Data access). Pages gate the role first,
 * so the actor mirrors the page session; the scoped services still re-check
 * every permission. Delivery/farmer/center reads reuse the scoped services
 * and add the display names those DTOs omit (farmer, center, cooperative,
 * product, recorder) so the UI never renders a bare uuid.
 */

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role ?? null };
}

/** Delivery DTO + the display names the shared DTO deliberately omits. */
export type AgentDeliveryView = DeliveryDto & {
  farmerName: string | null;
  farmerLocation: string | null;
  cooperativeName: string;
  collectionCenterName: string;
  productName: string;
  recordedByName: string | null;
};

async function enrichDeliveries(
  session: PageSession,
  deliveries: DeliveryDto[],
): Promise<AgentDeliveryView[]> {
  if (deliveries.length === 0) return [];

  const farmerIds = [...new Set(deliveries.map((d) => d.farmerId))];
  const centerIds = [...new Set(deliveries.map((d) => d.collectionCenterId))];
  const cooperativeIds = [...new Set(deliveries.map((d) => d.cooperativeId))];
  const recorderIds = [
    ...new Set(deliveries.map((d) => d.recordedById).filter((id): id is string => Boolean(id))),
  ];

  const catalogue = await getProductCatalog(session);
  const [farmerRows, centerRows, coopRows, recorderRows] = await Promise.all([
    farmerIds.length > 0
      ? db
          .select({ id: farmers.id, name: farmers.name, location: farmers.location })
          .from(farmers)
          .where(inArray(farmers.id, farmerIds))
      : Promise.resolve([] as { id: string; name: string; location: string | null }[]),
    centerIds.length > 0
      ? db
          .select({ id: collectionCenters.id, name: collectionCenters.name })
          .from(collectionCenters)
          .where(inArray(collectionCenters.id, centerIds))
      : Promise.resolve([] as { id: string; name: string }[]),
    cooperativeIds.length > 0
      ? db
          .select({ id: cooperatives.id, name: cooperatives.name })
          .from(cooperatives)
          .where(inArray(cooperatives.id, cooperativeIds))
      : Promise.resolve([] as { id: string; name: string }[]),
    recorderIds.length > 0
      ? db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, recorderIds))
      : Promise.resolve([] as { id: string; name: string | null }[]),
  ]);

  const farmerBy = new Map(farmerRows.map((f) => [f.id, f]));
  const centerBy = new Map(centerRows.map((c) => [c.id, c]));
  const coopBy = new Map(coopRows.map((c) => [c.id, c]));
  const recorderBy = new Map(recorderRows.map((u) => [u.id, u]));

  return deliveries.map((delivery) => {
    const farmer = farmerBy.get(delivery.farmerId);
    const center = centerBy.get(delivery.collectionCenterId);
    const coop = coopBy.get(delivery.cooperativeId);
    const recorder = delivery.recordedById ? recorderBy.get(delivery.recordedById) : null;
    return {
      ...delivery,
      farmerName: farmer?.name ?? null,
      farmerLocation: farmer?.location ?? null,
      cooperativeName: coop?.name ?? delivery.cooperativeId,
      collectionCenterName: center?.name ?? '—',
      productName: productName(catalogue, delivery.productId),
      recordedByName: recorder?.name ?? null,
    };
  });
}

/** Recorded deliveries across the agent's cooperatives, with display names. */
export async function listAgentDeliveries(
  session: PageSession,
  query: ListDeliveriesQuery,
): Promise<{ items: AgentDeliveryView[]; page: number; limit: number; total: number }> {
  const result = await listDeliveriesFromServer(asActor(session), query);
  return { ...result, items: await enrichDeliveries(session, result.items) };
}

/** One recorded delivery, for the snapshot detail screen. */
export async function getAgentDelivery(
  session: PageSession,
  id: string,
): Promise<AgentDeliveryView> {
  const delivery = await getDeliveryFromServer(asActor(session), id);
  const [view] = await enrichDeliveries(session, [delivery]);
  return view;
}

/** Active collection centers across the agent's memberships (for intake). */
export async function listAgentCenters(
  session: PageSession,
  query: ListCollectionCentersQuery = { page: 1, limit: 100 },
): Promise<CollectionCenterDto[]> {
  const result = await listCollectionCenters(asActor(session), query);
  return result.items.filter((center) => center.active);
}

/** Farmers inside the agent's memberships, newest first, for the stepper. */
export async function listAgentFarmers(
  session: PageSession,
  query: ListFarmersQuery,
): Promise<FarmerDto[]> {
  const result = await listFarmers(asActor(session), query);
  return result.items.filter((farmer) => farmer.active);
}

/** Cooperative names for the agent's memberships (header context). */
export async function getAgentContext(session: PageSession): Promise<string[]> {
  const memberships = await getActiveMemberships(session.user.id);
  if (memberships.length === 0) return [];
  const rows = await db
    .select({ name: cooperatives.name })
    .from(cooperatives)
    .where(
      and(
        inArray(
          cooperatives.id,
          memberships.map((m) => m.cooperativeId),
        ),
        isNull(cooperatives.deletedAt),
      ),
    )
    .orderBy(cooperatives.name);
  return rows.map((r) => r.name);
}

/** Active product catalog for the commodity selector. */
export async function getAgentProductCatalog(session: PageSession): Promise<ProductDto[]> {
  return getProductCatalog(session);
}