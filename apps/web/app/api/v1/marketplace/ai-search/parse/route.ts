import { aiSearchQuerySchema } from '@gebeyalink/validation';

import { AiProviderError } from '@/server/ai/provider';
import { enforceAiSearchRateLimit, RateLimitError } from '@/server/ai/rate-limit';
import { AiOutputError, parseSourcingQuery } from '@/server/ai/sourcing';
import { requireRole, resolveActor } from '@/server/authz/guards';
import { minOrderQuantityKg } from '@/server/config/business';
import {
  failureResponse,
  fromServiceError,
  okResponse,
  validationResponse,
} from '@/server/http/responses';
import { listProducts } from '@/server/products/service';

/**
 * POST /api/v1/marketplace/ai-search/parse
 *
 * Buyer-only. Converts a natural-language sourcing request into validated
 * marketplace search criteria. Read-only: it never reserves inventory, creates
 * an order, or exposes farmer/seller identity. The catalog and the configured
 * minimum order quantity are the source of truth; the model sees only those.
 */
export async function POST(request: Request): Promise<Response> {
  const actor = await resolveActor(request);
  if (!actor) {
    return failureResponse(401, 'unauthorized', 'authentication required');
  }
  try {
    requireRole(actor, 'buyer');

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return failureResponse(400, 'invalid_json', 'request body must be valid JSON');
    }
    const input = aiSearchQuerySchema.safeParse(payload);
    if (!input.success) return validationResponse(input.error);

    await enforceAiSearchRateLimit(actor.userId);

    const catalog = (await listProducts(actor)).map((product) => ({
      id: product.id,
      name: product.name,
    }));

    const result = await parseSourcingQuery({
      query: input.data.query,
      catalog,
      minOrderQuantityKg: minOrderQuantityKg(),
    });
    return okResponse(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return failureResponse(429, 'rate_limited', error.message);
    }
    if (error instanceof AiOutputError) {
      return failureResponse(
        502,
        'ai_unparseable',
        'The assistant could not read that request. Try rephrasing, or use the filters.',
      );
    }
    if (error instanceof AiProviderError) {
      if (error.code === 'not_configured') {
        return failureResponse(
          503,
          'ai_unavailable',
          'AI sourcing is not configured. Use the filters to search manually.',
        );
      }
      return failureResponse(
        502,
        'ai_error',
        'The sourcing assistant is temporarily unavailable. Use the filters to search manually.',
      );
    }
    return fromServiceError(error) ?? failureResponse(500, 'internal_error', 'unexpected error');
  }
}
