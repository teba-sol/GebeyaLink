import 'server-only';

import {
  geocoderBaseUrl,
  geocoderMinIntervalMs,
  geocoderMode,
  geocoderTimeoutMs,
} from '@/server/sourcing/config';

/**
 * Geocoding client for supplier-origin distance scoring — the second
 * third-party API (docs/ai-sourcing-solution-design.md §Integrations).
 *
 * Provider: **Open-Meteo Geocoding** (`geocoding-api.open-meteo.com/v1/search`).
 *   - No API key, no sign-up, HTTPS JSON GET.
 *   - Free tier is licensed for **non-commercial** use (CC BY 4.0 data) with a
 *     fair-use daily cap; a commercial licence/self-hosting is required for
 *     production (documented limitation, not silently ignored).
 *   - Set `GEOCODER_PROVIDER=off` to disable entirely (tests, offline).
 *
 * Ethiopia is the current market, so results are filtered to `countryCode=ET`
 * and to populated places (`feature_code` starts with `PPL`) — geocoding a
 * cooperative's region text must not resolve to a lake, park or admin area.
 *
 * Requests are cached in-process for the process lifetime (plus the existing
 * Redis cache when configured) and throttled to a single request per interval
 * to respect the provider's fair-use expectations.
 */

export type GeocodeResult = {
  query: string;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  admin1: string | null;
  /** Which origin string produced this result (already cached under). */
  resolvedFrom: string;
};

export class GeocoderError extends Error {
  readonly code: 'timeout' | 'request_failed' | 'invalid_response';

  constructor(code: GeocoderError['code'], message: string) {
    super(message);
    this.name = 'GeocoderError';
    this.code = code;
  }
}

type OpenMeteoResponse = {
  results?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    country_code?: string;
    admin1?: string;
    feature_code?: string;
  }[];
};

/** Query → result (or null = known unknown). Shared across the process. */
const memoryCache = new Map<string, GeocodeResult | null>();

let throttleChain: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.,;]+$/, '');
}

async function throttle(): Promise<void> {
  const minInterval = geocoderMinIntervalMs();
  const previous = throttleChain;
  let release: () => void = () => {};
  throttleChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const wait = lastRequestAt + minInterval - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
  release();
}

export function clearGeocodeCache(): void {
  memoryCache.clear();
}

export function isGeocoderEnabled(): boolean {
  return geocoderMode() === 'open-meteo';
}

/**
 * Geocode a free-text origin ("Adama, Oromia", "Sidama", "Humera").
 * Returns `null` when the provider is off, the query is too short, there is no
 * confident match, or the provider fails — callers must treat `null` as
 * "distance unverified" and score it as unknown, never as a match.
 */
export async function geocode(query: string | null | undefined): Promise<GeocodeResult | null> {
  if (!isGeocoderEnabled()) return null;
  if (!query) return null;
  const key = normalizeQuery(query);
  if (key.length < 3) return null;

  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  // For "Ada'a woreda, Oromia", try the most specific part first.
  const candidates = [
    key,
    ...key.split(',').map((part) => part.trim()).filter((part) => part.length >= 3),
  ].filter((value, index, all) => all.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      const result = await requestGeocode(candidate);
      if (result) {
        const stored: GeocodeResult = { ...result, resolvedFrom: candidate };
        memoryCache.set(key, stored);
        if (candidate !== key) memoryCache.set(candidate, stored);
        return stored;
      }
    } catch (error) {
      // Provider failure is not a hard error: the recommendation must still
      // work, just without distance scoring.
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[geocoder] ${candidate}: ${(error as Error).message}`);
      }
    }
  }

  memoryCache.set(key, null);
  return null;
}

async function requestGeocode(candidate: string): Promise<GeocodeResult | null> {
  await throttle();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), geocoderTimeoutMs());
  try {
    const url = new URL(`${geocoderBaseUrl()}/v1/search`);
    url.searchParams.set('name', candidate);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    url.searchParams.set('countryCode', 'ET');

    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new GeocoderError('request_failed', `geocoder responded ${res.status}`);
    }

    const body = (await res.json().catch(() => null)) as OpenMeteoResponse | null;
    if (!body || !Array.isArray(body.results)) return null;

    const place = body.results.find((row) => {
      const feature = row.feature_code ?? '';
      return (
        typeof row.latitude === 'number' &&
        typeof row.longitude === 'number' &&
        (feature.startsWith('PPL') || feature.startsWith('ADM'))
      );
    });
    if (!place) return null;

    return {
      query: candidate,
      name: place.name ?? candidate,
      latitude: place.latitude as number,
      longitude: place.longitude as number,
      countryCode: place.country_code ?? 'ET',
      admin1: place.admin1 ?? null,
      resolvedFrom: candidate,
    };
  } catch (error) {
    if (error instanceof GeocoderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeocoderError('timeout', 'geocoder timed out');
    }
    throw new GeocoderError('request_failed', 'geocoder request failed');
  } finally {
    clearTimeout(timer);
  }
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km (haversine). Pure — unit tested. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance between an origin string and a target string, or null when either
 * side cannot be confidently located. Results are cached, so a ranking run
 * geocodes each distinct origin at most once.
 */
export async function distanceKmBetween(
  from: string | null | undefined,
  to: string | null | undefined,
): Promise<number | null> {
  const [source, target] = await Promise.all([geocode(from), geocode(to)]);
  if (!source || !target) return null;
  return haversineKm(source, target);
}
