import { submitPaymentSchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { listPayments, submitPayment } from '@/server/payments/service';

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
    requireRole(actor, 'admin', 'cooperative_staff', 'buyer');
    return okResponse(await listPayments(actor, id));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}

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
    requireRole(actor, 'admin', 'buyer');
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const input = submitPaymentSchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    return okResponse(await submitPayment(actor, id, input.data), 201);
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
