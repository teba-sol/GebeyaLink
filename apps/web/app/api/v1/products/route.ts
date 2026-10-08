import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
} from '@/server/http/responses';
import { listProducts } from '@/server/products/service';

export async function GET(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
    return okResponse(await listProducts(actor));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}