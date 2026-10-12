import { updateProductSchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { updateProduct } from '@/server/products/service';

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin');
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const input = updateProductSchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    const { id } = await params;
    return okResponse(await updateProduct(actor, id, input.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}