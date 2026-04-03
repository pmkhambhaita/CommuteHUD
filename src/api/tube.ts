import type { TubeLineArrivals } from '../types';
import { TRANSITOUS_BASE } from '../types';
import { resolveStopId } from './geocode';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const resolvedStopIds = new Map<string, string>();

interface TubeResponse {
  lines: TubeLineArrivals[];
  generatedAt: string;
  station: string;
}

async function tryFetchTubeStoptimes(stopId: string, n: number): Promise<any> {
  const params = new URLSearchParams({ stopId, n: String(n), arriveBy: 'false' });
  params.append('mode', 'SUBWAY');
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) throw new Error(`Tube stoptimes error: ${res.status}`);
  return res.json();
}

export async function fetchTubeArrivals(
  stopIdOrName: string,
  filterLines: string[] = [],
): Promise<TubeResponse> {
  let stopId = resolvedStopIds.get(stopIdOrName) || stopIdOrName;
  let data: any;

  try {
    data = await tryFetchTubeStoptimes(stopId, 20);
  } catch {
    const resolved = await resolveStopId(stopIdOrName, 'SUBWAY');
    if (!resolved) throw new Error(`Could not find tube stop: ${stopIdOrName}`);
    resolvedStopIds.set(stopIdOrName, resolved);
    stopId = resolved;
    data = await tryFetchTubeStoptimes(stopId, 20);
  }

  const stopTimes: any[] = data.stopTimes || [];
  const lineMap = new Map<string, any[]>();

  for (const st of stopTimes) {
    const lineId = (st.routeShortName || st.routeLongName || st.displayName || 'unknown')
      .toLowerCase().replace(/\s+/g, '-');
    const lineName = st.routeShortName || st.routeLongName || st.displayName || 'Unknown';

    if (filterLines.length > 0 && !filterLines.some(f => lineId.includes(f.toLowerCase()))) {
      continue;
    }

    if (!lineMap.has(lineId)) lineMap.set(lineId, []);
    const place = st.place || {};
    const dep = place.departure || '';

    lineMap.get(lineId)!.push({
      lineId,
      lineName,
      destination: st.headsign || '',
      platform: place.track || place.scheduledTrack || '',
      departureTime: fmtTime(dep),
      delayMinutes: 0,
      mode: st.mode || 'SUBWAY',
      _ts: new Date(dep).getTime(),
    });
  }

  const lines = Array.from(lineMap.entries())
    .map(([id, arrivals]) => ({
      lineId: id,
      lineName: arrivals[0]?.lineName || id,
      arrivals: arrivals
        .sort((a: any, b: any) => a._ts - b._ts)
        .slice(0, 5)
        .map(({ _ts, ...rest }: any) => rest),
    }))
    .sort((a, b) => a.lineName.localeCompare(b.lineName));

  return {
    lines,
    generatedAt: new Date().toISOString(),
    station: data.place?.name || stopIdOrName,
  };
}

function fmtTime(iso: string): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
