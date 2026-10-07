import 'server-only';

import type { ApiFailure } from '@gebeyalink/types';

import { AuthzError } from '../authz/guards';
import { ConflictError } from '../cooperatives/service';
import { zodErrorMessages } from '../validation/zod';

export function failureResponse(status: number, code: string, message: string): Response {
  const body: ApiFailure = { error: { code, message } };
  return Response.json(body, { status });
}

export function okResponse<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

/** Render a Zod issue as an ApiFailure-shaped error response. */
export function validationResponse(error: unknown): Response {
  const { message, code } = zodErrorMessages(error);
  return failureResponse(400, code, message);
}

/** Map service-layer errors to HTTP responses; null when unexpected. */
export function fromServiceError(error: unknown): Response | null {
  if (error instanceof AuthzError) {
    const status = error.code === 'not_found' ? 404 : 403;
    return failureResponse(status, error.code, error.message);
  }
  if (error instanceof ConflictError) {
    return failureResponse(409, 'conflict', error.message);
  }
  return null;
}
