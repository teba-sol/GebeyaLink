import { registerOrganizationSchema } from '@gebeyalink/validation';

import { recordAuditEvent } from '@/server/audit/events';
import { resolveActor } from '@/server/authz/guards';
import { submitBuyerRegistration } from '@/server/buyers/service';
import { submitCooperativeRegistration } from '@/server/cooperatives/service';
import { db } from '@/server/db';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { submitTransporterRegistration } from '@/server/transporters/service';

/**
 * Organization self-registration (docs/prd.md §49 Onboarding; §7). A signed-in
 * user with no platform role submits one organization; it starts `pending`.
 */
export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const parsed = registerOrganizationSchema.safeParse(payload);
    if (!parsed.success) return validationResponse(parsed.error);
    const input = parsed.data;

    const org =
      input.type === 'cooperative'
        ? await submitCooperativeRegistration(actor, input)
        : input.type === 'buyer'
          ? await submitBuyerRegistration(actor, input)
          : await submitTransporterRegistration(actor, input);

    const name =
      input.type === 'cooperative'
        ? input.name
        : input.type === 'buyer'
          ? input.organizationName
          : input.companyName;

    await db.transaction(async (tx) => {
      await recordAuditEvent(tx, {
        eventType: 'verification.submitted',
        actorId: actor.userId,
        actorRole: actor.role,
        entityType: input.type,
        entityId: org.id,
        cooperativeId: input.type === 'cooperative' ? org.id : undefined,
        metadata: { type: input.type, name },
      });
    });

    return okResponse(org, 201);
  } catch (error) {
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
