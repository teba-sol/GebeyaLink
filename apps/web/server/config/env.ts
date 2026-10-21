import 'server-only';

/**
 * Environment helpers shared by server config modules. Env values are read
 * lazily per call (never snapshotted at module load) so tests and local dev
 * can change them, matching the existing `server/config/business.ts` style.
 */

/** Parse a positive number from env, falling back when absent or invalid. */
export function positiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
