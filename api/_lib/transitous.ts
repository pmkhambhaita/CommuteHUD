const TRANSITOUS_BASE = 'https://api.transitous.org';

export async function fetchStopTimes(
  stopId: string,
  n: number = 5,
  mode: string[] = ['RAIL', 'SUBURBAN'],
): Promise<any> {
  const params = new URLSearchParams({
    stopId,
    n: String(n),
    arriveBy: 'false',
  });
  for (const m of mode) {
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

export async function fetchPlan(
  fromPlace: string,
  toPlace: string,
  time?: string,
  transitModes: string[] = ['RAIL', 'SUBURBAN'],
  n: number = 5,
): Promise<any> {
  const params = new URLSearchParams({
    fromPlace,
    toPlace,
    numItineraries: String(n),
    arriveBy: 'false',
  });
  if (time) params.set('time', time);
  for (const m of transitModes) {
    params.append('transitModes', m);
  }
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/plan?${params}`);
  if (!res.ok) throw new Error(`Transitous plan error: ${res.status}`);
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
