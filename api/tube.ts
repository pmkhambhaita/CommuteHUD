import { fetchTubeStopTimes } from './_lib/transitous';

export const config = { runtime: 'edge' };

function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function minutesUntil(isoStr: string): number {
  const target = new Date(isoStr).getTime();
  return Math.max(0, Math.round((target - Date.now()) / 60000));
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const stopId = url.searchParams.get('stopId') || 'gb:tfl:940GZZLUKSX';
    const filterLines = url.searchParams.get('lines')?.split(',').filter(Boolean) || [];

    const data = await fetchTubeStopTimes(stopId, 20);
    const stopTimes: any[] = data.stopTimes || [];

    // Group by route/line
    const lineMap = new Map<string, any[]>();
    for (const st of stopTimes) {
      const lineId = (st.routeShortName || st.routeLongName || st.displayName || 'unknown').toLowerCase().replace(/\s+/g, '-');
      const lineName = st.routeShortName || st.routeLongName || st.displayName || 'Unknown';

      // Filter by requested lines if any
      if (filterLines.length > 0 && !filterLines.some(f => lineId.includes(f.toLowerCase()))) {
        continue;
      }

      if (!lineMap.has(lineId)) lineMap.set(lineId, []);

      const place = st.place || {};
      const departure = place.departure || '';

      lineMap.get(lineId)!.push({
        lineId,
        lineName,
        destination: st.headsign || '',
        platform: place.track || place.scheduledTrack || '',
        departureTime: formatTime(departure),
        delayMinutes: 0,
        minutesAway: minutesUntil(departure),
        mode: st.mode || 'SUBWAY',
      });
    }

    // Sort arrivals within each line by time, limit to 5
    const lines = Array.from(lineMap.entries())
      .map(([lineId, arrivals]) => ({
        lineId,
        lineName: arrivals[0]?.lineName || lineId,
        arrivals: arrivals.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, 5),
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
