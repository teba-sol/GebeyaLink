import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'gebeyalink.db';

export const MIGRATIONS: string[] = [];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = 'wal';");
  await db.execAsync("PRAGMA foreign_keys = 'ON';");

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version > MIGRATIONS.length) {
    throw new Error(
      `Local database version ${version} is newer than the supported version ${MIGRATIONS.length}`,
    );
  }

  while (version < MIGRATIONS.length) {
    const nextVersion = version + 1;
    const migration = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
      await db.execAsync(`PRAGMA user_version = ${nextVersion}`);
    });
    version = nextVersion;
  }
}
