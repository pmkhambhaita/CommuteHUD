import { TRANSITOUS_BASE } from '../types';

export interface GeoMatch {
  type: string;
  name: string;
  id: string;
  lat: number;
  lon: number;
  modes?: string[];
}

/**
 * Resolve a station name to its Transitous stop ID.
 * Uses the /api/v1/geocode endpoint.
 */
export async function geocodeStop(text: string, modeFilter?: string): Promise<GeoMatch[]> {
  const params = new URLSearchParams({ text });
  if (modeFilter) params.append('mode', modeFilter);
  const res = await fetch(`${TRANSITOUS_BASE}/api/v1/geocode?${params}`);
  if (!res.ok) throw new Error(`Geocode error: ${res.status}`);
  const matches: any[] = await res.json();
  return matches
    .filter((m: any) => m.type === 'STOP')
    .map((m: any) => ({
      type: m.type,
      name: m.name,
      id: m.id,
      lat: m.lat,
      lon: m.lon,
      modes: m.modes,
    }));
}

/**
 * Find the best stop ID for a station name.
 * Tries exact match first, then falls back to first result.
 */
export async function resolveStopId(
  stationName: string,
  modeFilter?: string,
): Promise<string | null> {
  const matches = await geocodeStop(stationName, modeFilter);
  if (matches.length === 0) return null;

  // Try to find an exact name match
  const nameLower = stationName.toLowerCase();
  const exact = matches.find(
    (m) => m.name.toLowerCase() === nameLower ||
           m.name.toLowerCase().includes(nameLower),
  );
  return exact?.id || matches[0].id;
}
