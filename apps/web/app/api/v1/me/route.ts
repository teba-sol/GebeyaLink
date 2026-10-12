import { resolveActor } from '@/server/authz/guards';
import { failureResponse, okResponse } from '@/server/http/responses';

/** Returns the signed-in user's platform role (null while awaiting onboarding). */
export async function GET(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  return okResponse({ role: actor.role });
}
