import { confirmPickupSchema } from '@gebeyalink/validation';

import { requireRole, resolveActor } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { confirmCoopPickup, confirmTransporterPickup } from '@/server/transportation/service';

/**
 * Pickup requires both cooperative and transporter confirmation
 * (docs/prd.md §26, FR-030). The actor's role selects which side is recorded.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  const { id } = await params;
  try {
    requireRole(actor, 'admin', 'cooperative_staff', 'transporter');
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const input = confirmPickupSchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    const result =
      actor.role === 'transporter'
        ? await confirmTransporterPickup(actor, id, input.data)
        : await confirmCoopPickup(actor, id, input.data);
    return okResponse(result);
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
