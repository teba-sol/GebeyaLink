import 'server-only';

import { positiveNumber } from '@/server/config/env';

/**
 * Ranking weights for the deterministic supplier score
 * (docs/ai-sourcing-solution-design.md §Ranking algorithm).
 *
 * The five weights sum to 1 and are deliberately *constants*, not env-driven:
 * the assignment requires traceable scoring, and a deployment silently
 * changing how one supplier outranks another would break auditability. Every
 * response reports `algorithmVersion` so a change here is visible.
 *
 * Missing data scores 0 on that component while its weight is still counted —
 * a supplier with unknown data can never gain an advantage over one whose
 * data is known.
 */

export const RANKING_WEIGHTS = {
  /** Can this supplier cover what the buyer asked for, and with what headroom. */
  quantity: 0.3,
  /** Listed unit price relative to the buyer's ceiling / the best candidate. */
  price: 0.25,
  /** Exact grade match vs an unspecified-or-lower grade. */
  grade: 0.2,
  /** Proximity band from the geocoded origin (only when the buyer asked). */
  location: 0.15,
  /** How complete the listing/cooperative record is (never inflates score). */
  completeness: 0.1,
} as const;

/** Distance bands (km) used by the location component. */
export const LOCATION_DISTANCE_BANDS_KM = [50, 150, 400, 900] as const;

/**
 * Year in kg used for tie-breaking on availability headroom: a supplier can
 * cover the request and still be ranked above an identical one only by a
 * deterministic rule, never by chance.
 */
export const LOCATION_UNKNOWN_SCORE = 0;
export const LOCATION_UNPREFERRED_SCORE = 0.6;

/** Default geocoder settings (Open-Meteo, no API key). */
export const GEOCODER_DEFAULT_TIMEOUT_MS = 8_000;
export const GEOCODER_DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const GEOCODER_DEFAULT_MIN_INTERVAL_MS = 1_000;

export type GeocoderMode = 'open-meteo' | 'off';

export function geocoderMode(): GeocoderMode {
  const raw = (process.env.GEOCODER_PROVIDER ?? 'open-meteo').toLowerCase();
  return raw === 'off' ? 'off' : 'open-meteo';
}

export function geocoderBaseUrl(): string {
  return (process.env.GEOCODER_BASE_URL ?? 'https://geocoding-api.open-meteo.com').replace(/\/+$/, '');
}

export function geocoderTimeoutMs(): number {
  return positiveNumber(process.env.GEOCODER_TIMEOUT_MS, GEOCODER_DEFAULT_TIMEOUT_MS);
}

export function geocoderMinIntervalMs(): number {
  return positiveNumber(process.env.GEOCODER_MIN_INTERVAL_MS, GEOCODER_DEFAULT_MIN_INTERVAL_MS);
}
