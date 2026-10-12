import { verificationActionSchema, verificationOrgTypeSchema } from '@gebeyalink/validation';

import { resolveActor } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { applyVerification } from '@/server/verifications/service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  const { type, id } = await params;
  const orgType = verificationOrgTypeSchema.safeParse(type);
  if (!orgType.success) {
    return failureResponse(404, 'not_found', 'unknown organization type');
  }
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const action = verificationActionSchema.safeParse(payload);
    if (!action.success) return validationResponse(action.error);
    return okResponse(await applyVerification(actor, orgType.data, id, action.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
