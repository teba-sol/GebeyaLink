import 'server-only';

import { Redis } from 'ioredis';

/**
 * Redis client (docs/tech-stack.md). Configuration only — nothing verifies
 * or requires a live connection during scaffolding. Callers must handle the
 * `null` (unconfigured) case; connection errors are surfaced by ioredis at
 * call time, never at import time.
 */

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });
    // Never let background connection errors crash the process; call sites
    // observe failures from the commands they await.
    client.on('error', () => {});
  }

  return client;
}
