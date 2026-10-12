import { updateMembershipSchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { removeMembership, updateMembership } from '@/server/users/service';

type Params = Promise<{ id: string; membershipId: string }>;

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
    const input = updateMembershipSchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);
    const { membershipId } = await params;
    return okResponse(await updateMembership(actor, membershipId, input.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }): Promise<Response> {
  const actor = await resolveActor(_request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'admin');
    const { membershipId } = await params;
    await removeMembership(actor, membershipId);
    return okResponse({ id: membershipId });
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}