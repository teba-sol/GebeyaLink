import { describe, expect, it } from 'vitest';

import { GET } from '../app/api/v1/health/route';

describe('GET /api/v1/health', () => {
  it('returns an ok envelope with a database state', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');

    const body = (await res.json()) as {
      data: { status: string; database: string; timestamp: string };
    };

    expect(body.data.status).toBe('ok');
    expect(['up', 'down', 'unconfigured']).toContain(body.data.database);
    expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
  });
});
