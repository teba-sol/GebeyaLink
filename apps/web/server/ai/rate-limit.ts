import 'server-only';

import { getRedis } from '../cache/redis';

/**
 * Best-effort rate limit for the AI sourcing endpoint. Redis is only used when
 * already configured (`REDIS_URL`); if it is absent or unreachable the request
 * proceeds — Redis is never a hard dependency (docs/tech-stack.md).
 */

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export class RateLimitError extends Error {
  readonly code = 'rate_limited';

  constructor(message = 'too many AI search requests, please try again shortly') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function enforceAiSearchRateLimit(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = `ai-sourcing:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > MAX_REQUESTS) throw new RateLimitError();
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // Redis unavailable → fail open; the AI call stays functional.
  }
}
