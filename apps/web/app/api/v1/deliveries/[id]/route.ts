import { resolveActor, requireRole } from '@/server/authz/guards';
import { getDelivery } from '@/server/deliveries/service';
import {
  failureResponse,
  fromServiceError,
  okResponse,
} from '@/server/http/responses';

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
    return okResponse(await getDelivery(actor, id));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}