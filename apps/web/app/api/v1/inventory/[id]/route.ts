import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
} from '@/server/http/responses';
import { getInventoryLot } from '@/server/inventory/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  const { id } = await params;
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'collection_agent');
    return okResponse(await getInventoryLot(actor, id));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}