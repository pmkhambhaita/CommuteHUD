import { fetchStopTimes } from './_lib/transitous';

export const config = { runtime: 'edge' };

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function calcDelay(scheduled: string | undefined, actual: string): number {
  if (!scheduled) return 0;
  const s = new Date(scheduled).getTime();
  const a = new Date(actual).getTime();
  return Math.max(0, Math.round((a - s) / 60000));
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const stopId = url.searchParams.get('stopId') || 'gb:atoc:SVG';
    const filterDest = url.searchParams.get('destination') || '';
    const n = parseInt(url.searchParams.get('n') || '6');

    const data = await fetchStopTimes(stopId, n);
    const stopTimes: any[] = data.stopTimes || [];

    const departures = stopTimes
      .filter((st: any) => {
        if (!filterDest) return true;
        // Filter by destination/headsign containing the filter text
        const headsign = (st.headsign || '').toLowerCase();
        const dest = filterDest.toLowerCase();
        return headsign.includes(dest) || headsign.includes("king's cross") || headsign.includes('kings cross');
      })
      .map((st: any) => {
        const place = st.place || {};
        const departure = place.departure || '';
        const scheduledDep = place.scheduledDeparture || departure;
        const delayMinutes = calcDelay(scheduledDep, departure);
        const scheduledTime = formatTime(scheduledDep);
        const estimatedTime = formatTime(departure);
        const platform = place.track || place.scheduledTrack || '-';

        return {
          tripId: st.tripId || '',
          scheduledTime,
          estimatedTime,
          platform,
          operator: st.agencyName || '',
          destination: st.headsign || '',
          headsign: st.headsign || '',
          isCancelled: st.cancelled || st.tripCancelled || false,
          delayMinutes,
          routeName: st.displayName || st.routeShortName || st.routeLongName || '',
          duration: 0, // Will be enriched by plan endpoint
          estimatedArrival: '',
          mode: st.mode || 'RAIL',
          intermediateStopCount: 0,
        };
      });

    return new Response(JSON.stringify({
      departures,
      generatedAt: new Date().toISOString(),
      station: data.place?.name || stopId,
    }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=15' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
