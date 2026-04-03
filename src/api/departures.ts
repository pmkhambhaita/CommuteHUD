import type { Departure } from '../types';
import { TRANSITOUS_BASE } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface DeparturesResponse {
  departures: Departure[];
  generatedAt: string;
  station: string;
}

export async function fetchDepartures(
  stopId: string,
  destinationFilter: string = '',
): Promise<DeparturesResponse> {
  // Try backend proxy first, fall back to direct Transitous
  const useProxy = !!API_BASE;
  if (useProxy) {
    const params = new URLSearchParams({ stopId, destination: destinationFilter, n: '6' });
    const res = await fetch(`${API_BASE}/api/departures?${params}`);
    if (!res.ok) throw new Error(`Departures API error: ${res.status}`);
    return res.json();
  }

  // Direct Transitous call (no key needed)
  const params = new URLSearchParams({ stopId, n: '8', arriveBy: 'false' });
  params.append('mode', 'RAIL');
  params.append('mode', 'SUBURBAN');
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) throw new Error(`Transitous error: ${res.status}`);
  const data = await res.json();

  const stopTimes: any[] = data.stopTimes || [];
  const departures: Departure[] = stopTimes
    .filter((st: any) => {
      if (!destinationFilter) return true;
      const h = (st.headsign || '').toLowerCase();
      const f = destinationFilter.toLowerCase();
      return h.includes(f) || h.includes("king's cross") || h.includes('kings cross');
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
    station: data.place?.name || stopId,
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
