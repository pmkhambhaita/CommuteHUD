const TRANSITOUS_BASE = 'https://api.transitous.org';

export async function fetchStopTimes(
  stopId: string,
  n: number = 5,
  modes: string[] = ['TRANSIT'],
): Promise<any> {
  const params = new URLSearchParams({
    stopId,
    n: String(n),
    arriveBy: 'false',
  });
  for (const m of modes) {
    params.append('mode', m);
  }
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) throw new Error(`Transitous stoptimes error: ${res.status}`);
  return res.json();
}

export async function fetchTrip(tripId: string): Promise<any> {
  const params = new URLSearchParams({ tripId });
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/trip?${params}`);
  if (!res.ok) throw new Error(`Transitous trip error: ${res.status}`);
  return res.json();
}

export async function fetchTubeStopTimes(
  stopId: string,
  n: number = 10,
): Promise<any> {
  const params = new URLSearchParams({
    stopId,
    n: String(n),
    arriveBy: 'false',
  });
  params.append('mode', 'SUBWAY');
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) throw new Error(`Transitous tube stoptimes error: ${res.status}`);
  return res.json();
}

export async function geocode(text: string): Promise<any[]> {
  const params = new URLSearchParams({ text });
  const res = await fetch(`${TRANSITOUS_BASE}/api/v1/geocode?${params}`);
  if (!res.ok) throw new Error(`Transitous geocode error: ${res.status}`);
  return res.json();
}

/**
 * Resolve a station name to a stop ID. Tries the name as a stop ID first,
 * falls back to geocoding.
 */
export async function resolveStopId(nameOrId: string, mode?: string): Promise<string> {
  // First try using it directly as a stop ID
  try {
    const params = new URLSearchParams({ stopId: nameOrId, n: '1', arriveBy: 'false' });
    if (mode) params.append('mode', mode);
    const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (data.stopTimes && data.stopTimes.length > 0) {
        return nameOrId; // Works as-is
      }
    }
  } catch {
    // Fall through to geocode
  }

  // Geocode the name
  const matches = await geocode(nameOrId);
  const stops = matches.filter((m: any) => m.type === 'STOP');
  if (stops.length === 0) throw new Error(`No stop found for: ${nameOrId}`);

  // If mode filter, prefer stops with that mode
  if (mode) {
    const withMode = stops.find((s: any) =>
      s.modes && s.modes.includes(mode),
    );
    if (withMode) return withMode.id;
  }

  return stops[0].id;
}
