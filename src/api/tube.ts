import type { TubeLineArrivals } from '../types';
import { TRANSITOUS_BASE } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface TubeResponse {
  lines: TubeLineArrivals[];
  generatedAt: string;
  station: string;
}

export async function fetchTubeArrivals(
  stopId: string,
  filterLines: string[] = [],
): Promise<TubeResponse> {
  const useProxy = !!API_BASE;
  if (useProxy) {
    const params = new URLSearchParams({ stopId });
    if (filterLines.length > 0) params.set('lines', filterLines.join(','));
    const res = await fetch(`${API_BASE}/api/tube?${params}`);
    if (!res.ok) throw new Error(`Tube API error: ${res.status}`);
    return res.json();
  }

  // Direct Transitous call
  const params = new URLSearchParams({ stopId, n: '20', arriveBy: 'false' });
  params.append('mode', 'SUBWAY');
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/stoptimes?${params}`);
  if (!res.ok) throw new Error(`Transitous tube error: ${res.status}`);
  const data = await res.json();

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
      _epochMs: new Date(dep).getTime(),
    });
  }

  const lines = Array.from(lineMap.entries())
    .map(([lineId, arrivals]) => ({
      lineId,
      lineName: arrivals[0]?.lineName || lineId,
      arrivals: arrivals
        .sort((a: any, b: any) => a._epochMs - b._epochMs)
        .slice(0, 5)
        .map(({ _epochMs, ...rest }: any) => rest),
    }))
    .sort((a, b) => a.lineName.localeCompare(b.lineName));

  return {
    lines,
    generatedAt: new Date().toISOString(),
    station: data.place?.name || stopId,
  };
}

function fmtTime(iso: string): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
