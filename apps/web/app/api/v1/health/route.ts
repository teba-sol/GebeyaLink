import type { ApiSuccess } from '@gebeyalink/types';
import { sql } from 'drizzle-orm';

import { db } from '@/server/db';

type DatabaseState = 'up' | 'down' | 'unconfigured';

export type HealthReport = {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  database: DatabaseState;
};

async function checkDatabase(): Promise<DatabaseState> {
  if (!process.env.DATABASE_URL) return 'unconfigured';
  try {
    await db.execute(sql`SELECT 1`);
    return 'up';
  } catch {
    return 'down';
  }
}

export async function GET(): Promise<Response> {
  const body: ApiSuccess<HealthReport> = {
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: await checkDatabase(),
    },
  };

  return Response.json(body, {
    headers: { 'cache-control': 'no-store' },
  });
}
