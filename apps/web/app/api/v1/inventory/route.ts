import { listInventoryQuerySchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { listInventory } from '@/server/inventory/service';

export async function GET(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
    const query = listInventoryQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) return validationResponse(query.error);
    return okResponse(await listInventory(actor, query.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}