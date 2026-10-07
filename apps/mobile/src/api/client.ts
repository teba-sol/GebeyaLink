import type { ApiEnvelope } from '@gebeyalink/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('invalid_response', `HTTP ${response.status}`);
  }

  if ('error' in body) {
    throw new ApiError(body.error.code, body.error.message);
  }
  if (!response.ok) {
    throw new ApiError('http_error', `HTTP ${response.status}`);
  }
  return body.data;
}

export const api = {
  get: <T>(path: string, init?: RequestInit): Promise<T> =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, payload?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
};
