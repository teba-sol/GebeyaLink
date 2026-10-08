import { updateListingSchema } from '@gebeyalink/validation';

import { resolveActor, requireRole } from '@/server/authz/guards';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { getListing, updateListing } from '@/server/marketplace/service';

const BROWSE_ROLES = ['admin', 'cooperative_staff', 'collection_agent', 'buyer'] as const;

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
    requireRole(actor, ...BROWSE_ROLES);
    return okResponse(await getListing(actor, id));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}

export async function PATCH(
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
    const patch = updateListingSchema.safeParse(payload);
    if (!patch.success) return validationResponse(patch.error);
    return okResponse(await updateListing(actor, id, patch.data));
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
