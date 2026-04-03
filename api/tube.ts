import { fetchTubeStopTimes, resolveStopId } from './_lib/transitous';

export const config = { runtime: 'edge' };

function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    let stopId = url.searchParams.get('stopId') || "King's Cross St. Pancras";
    const filterLines = url.searchParams.get('lines')?.split(',').filter(Boolean) || [];

    // Resolve stop ID
    stopId = await resolveStopId(stopId, 'SUBWAY');

    const data = await fetchTubeStopTimes(stopId, 20);
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
        departureTime: formatTime(dep),
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

    return new Response(JSON.stringify({
      lines,
      generatedAt: new Date().toISOString(),
      station: data.place?.name || stopId,
    }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=10' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
