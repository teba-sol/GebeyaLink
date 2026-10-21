import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Second third-party API: Open-Meteo Geocoding (no API key).
 *
 * These tests never touch the network — `fetch` is stubbed. They pin the
 * behaviours the sourcing pipeline depends on: country/place filtering, cache
 * reuse, graceful degradation, and correct great-circle maths.
 */

const ET_PLACE = {
  results: [
    {
      name: 'Adama',
      latitude: 8.54,
      longitude: 39.27,
      country_code: 'ET',
      admin1: 'Oromia',
      feature_code: 'PPLA',
    },
  ],
};

async function loadGeocoder(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  process.env.GEOCODER_PROVIDER = 'open-meteo';
  process.env.GEOCODER_MIN_INTERVAL_MS = '0';
  process.env.GEOCODER_TIMEOUT_MS = '2000';
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import('../server/geo/geocoder');
}

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('haversineKm', () => {
  it('returns 0 for identical points', async () => {
    const { haversineKm } = await loadGeocoder();
    expect(haversineKm({ latitude: 8.54, longitude: 39.27 }, { latitude: 8.54, longitude: 39.27 })).toBe(0);
  });

  it('matches a known distance (Adama → Hawassa ≈ 190 km)', async () => {
    const { haversineKm } = await loadGeocoder();
    const km = haversineKm({ latitude: 8.54, longitude: 39.27 }, { latitude: 7.05, longitude: 38.48 });
    expect(km).toBeGreaterThan(150);
    expect(km).toBeLessThan(230);
  });
});

describe('geocode', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('returns null without a network call when the provider is off', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder({ GEOCODER_PROVIDER: 'off' });
    expect(await geocode('Adama')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ignores queries shorter than 3 characters', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder();
    expect(await geocode('ab')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves an Ethiopian place and filters to the country', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ET_PLACE,
    });
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder();
    const result = await geocode('Adama, Oromia');
    expect(result?.name).toBe('Adama');
    expect(result?.countryCode).toBe('ET');
    expect(result?.latitude).toBeCloseTo(8.54, 2);
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('countryCode=ET');
    expect(url).toContain('/v1/search');
  });

  it('caches a result so the same origin is geocoded once', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ET_PLACE });
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode, clearGeocodeCache } = await loadGeocoder();
    clearGeocodeCache();
    await geocode('Adama');
    await geocode('Adama');
    await geocode('adama');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns null (never a guess) when there is no populated place', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ name: 'Lake', latitude: 8, longitude: 39, feature_code: 'LK' }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder();
    expect(await geocode('Somewhere')).toBeNull();
  });

  it('degrades to null on provider failure instead of throwing', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder();
    await expect(geocode('Adama')).resolves.toBeNull();
  });

  it('degrades to null on a malformed response body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unexpected: true }) });
    vi.stubGlobal('fetch', fetchSpy);
    const { geocode } = await loadGeocoder();
    expect(await geocode('Adama')).toBeNull();
  });
});

describe('distanceKmBetween', () => {
  it('returns null when either origin cannot be located', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    vi.stubGlobal('fetch', fetchSpy);
    const { distanceKmBetween } = await loadGeocoder();
    expect(await distanceKmBetween('Adama', 'Nowhere')).toBeNull();
  });

  it('computes a positive distance when both origins resolve', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (input: URL | string) => {
      const name = String(input);
      const coord = name.includes('hawassa')
        ? { latitude: 7.05, longitude: 38.48 }
        : { latitude: 8.54, longitude: 39.27 };
      return {
        ok: true,
        json: async () => ({
          results: [{ name: 'X', country_code: 'ET', feature_code: 'PPL', ...coord }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchSpy);
    const { distanceKmBetween } = await loadGeocoder();
    const km = await distanceKmBetween('Adama', 'Hawassa');
    expect(km).toBeGreaterThan(0);
  });
});
