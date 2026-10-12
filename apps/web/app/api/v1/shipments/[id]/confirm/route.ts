import { confirmDeliverySchema } from '@gebeyalink/validation';

import { requireRole, resolveActor } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { confirmDelivery } from '@/server/transportation/service';

/**
 * Buyer confirms delivery; the order moves to COMPLETED and ownership
 * transfers (docs/prd.md §29–§30). Transporter/admin may record it on the
 * buyer's behalf (docs/prd.md §44).
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
    requireRole(actor, 'admin', 'buyer', 'transporter');
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const input = confirmDeliverySchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    return okResponse(await confirmDelivery(actor, id, input.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
