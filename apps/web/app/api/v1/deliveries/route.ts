import { createDeliverySchema, listDeliveriesQuerySchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import { createDelivery, listDeliveries } from '@/server/deliveries/service';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';

export async function GET(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
    const query = listDeliveriesQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) return validationResponse(query.error);
    return okResponse(await listDeliveries(actor, query.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}

export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const input = createDeliverySchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    return okResponse(await createDelivery(actor, input.data), 201);
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}