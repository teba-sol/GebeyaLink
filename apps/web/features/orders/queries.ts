import 'server-only';

import type { OrderDto, PaginatedOrders, PaymentDto } from '@gebeyalink/types';
import type { ListOrdersQuery } from '@gebeyalink/validation';

import type { PageSession } from '@/lib/session';
import { type Actor } from '@/server/authz/guards';
import { getOrder as getOrderFromServer, listOrders } from '@/server/orders/service';
import { listPayments as listPaymentsFromServer } from '@/server/payments/service';

/**
 * Server-side reads for the buyer order journey. Roles are re-checked in
 * the service layer on top of the page gate.
 */

function asActor(session: PageSession): Actor {
  return { userId: session.user.id, role: session.role ?? null };
}

export async function browseOrders(
  session: PageSession,
  query: ListOrdersQuery,
): Promise<PaginatedOrders> {
  return listOrders(asActor(session), query);
}

export async function getOrder(session: PageSession, id: string): Promise<OrderDto> {
  return getOrderFromServer(asActor(session), id);
}

export async function getPayments(session: PageSession, orderId: string): Promise<PaymentDto[]> {
  return listPaymentsFromServer(asActor(session), orderId);
}