import type { Departure } from '../types';
import { TRANSITOUS_BASE } from '../types';
import { resolveStopId } from './geocode';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface DeparturesResponse {
  departures: Departure[];
  generatedAt: string;
  station: string;
}

// Cache resolved stop IDs
const resolvedStopIds = new Map<string, string>();

async function getStopId(nameOrId: string, mode?: string): Promise<string> {
  // If it looks like a stop ID already, use it
  // But if it fails, we'll fall back to geocoding
  if (resolvedStopIds.has(nameOrId)) {
    return resolvedStopIds.get(nameOrId)!;
  }
  return nameOrId;
}

async function tryFetchStoptimes(stopId: string, n: number, modes: string[]): Promise<any> {
  const params = new URLSearchParams({
    stopId,
    n: String(n),
    arriveBy: 'false',
  });
  for (const m of modes) {
    params.append('mode', m);
  }
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) {
    throw new Error(`Stoptimes error ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

export async function fetchDepartures(
  stopIdOrName: string,
  destinationFilter: string = '',
): Promise<DeparturesResponse> {
  // Try with the given ID first
  let stopId = await getStopId(stopIdOrName);
  let data: any;

  try {
    data = await tryFetchStoptimes(stopId, 8, ['TRANSIT']);
  } catch (err) {
    // Stop ID didn't work — try geocoding the name
    console.warn(`Stop ID "${stopId}" failed, trying geocode...`);
    const resolved = await resolveStopId(stopIdOrName);
    if (!resolved) {
      throw new Error(`Could not find stop: ${stopIdOrName}`);
    }
    console.log(`Resolved "${stopIdOrName}" to stop ID: ${resolved}`);
    resolvedStopIds.set(stopIdOrName, resolved);
    stopId = resolved;
    data = await tryFetchStoptimes(stopId, 8, ['TRANSIT']);
  }

  const stopTimes: any[] = data.stopTimes || [];

  if (stopTimes.length === 0 && !resolvedStopIds.has(stopIdOrName)) {
    // Empty results — the ID might be wrong, try geocoding
    const resolved = await resolveStopId(stopIdOrName);
    if (resolved && resolved !== stopId) {
      console.log(`No results for "${stopId}", resolved to: ${resolved}`);
      resolvedStopIds.set(stopIdOrName, resolved);
      data = await tryFetchStoptimes(resolved, 8, ['TRANSIT']);
    }
  }

  const freshStopTimes: any[] = data.stopTimes || [];

  const departures: Departure[] = freshStopTimes
    .filter((st: any) => {
      if (!destinationFilter) return true;
      const h = (st.headsign || '').toLowerCase();
      const f = destinationFilter.toLowerCase();
      return h.includes(f) || h.includes("king's cross") || h.includes('kings cross') || h.includes('london');
    })
    .slice(0, 6)
    .map((st: any) => {
      const place = st.place || {};
      const dep = place.departure || '';
      const schedDep = place.scheduledDeparture || dep;
      const delay = calcDelay(schedDep, dep);

      return {
        tripId: st.tripId || '',
        scheduledTime: fmtTime(schedDep),
        estimatedTime: fmtTime(dep),
        platform: place.track || place.scheduledTrack || '-',
        operator: st.agencyName || '',
        destination: st.headsign || '',
        headsign: st.headsign || '',
        isCancelled: st.cancelled || st.tripCancelled || false,
        delayMinutes: delay,
        routeName: st.displayName || st.routeShortName || '',
        duration: 0,
        estimatedArrival: '',
        mode: st.mode || 'RAIL',
        intermediateStopCount: 0,
      };
    });

  return {
    departures,
    generatedAt: new Date().toISOString(),
    station: data.place?.name || stopIdOrName,
  };
}

function fmtTime(iso: string): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function calcDelay(sched: string, actual: string): number {
  if (!sched || !actual) return 0;
  return Math.max(0, Math.round((new Date(actual).getTime() - new Date(sched).getTime()) / 60000));
}
