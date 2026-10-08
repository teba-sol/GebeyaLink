import { failPaymentSchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { failPayment } from '@/server/payments/service';

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
    requireRole(actor, 'admin', 'cooperative_staff');
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const input = failPaymentSchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    return okResponse(await failPayment(actor, id, input.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
