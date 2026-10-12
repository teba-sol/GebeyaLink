import { requireRole, resolveActor } from '@/server/authz/guards';
import { failureResponse, fromServiceError, okResponse } from '@/server/http/responses';
import { listCoopShipments, listTransporterShipments } from '@/server/transportation/service';

/**
 * Shipment list scoped by role: a transporter sees their assignments, a
 * cooperative sees shipments leaving their cooperatives (docs/prd.md §41,
 * §24). Status is an optional filter.
 */
export async function GET(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'transporter');
    const items =
      actor.role === 'transporter'
        ? await listTransporterShipments(actor)
        : await listCoopShipments(actor);
    return okResponse(items);
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
