import { fetchStopTimes, resolveStopId } from './_lib/transitous';

export const config = { runtime: 'edge' };

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function calcDelay(scheduled: string | undefined, actual: string): number {
  if (!scheduled) return 0;
  return Math.max(0, Math.round((new Date(actual).getTime() - new Date(scheduled).getTime()) / 60000));
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    let stopId = url.searchParams.get('stopId') || 'Stevenage';
    const filterDest = url.searchParams.get('destination') || '';
    const n = parseInt(url.searchParams.get('n') || '6');

    // Resolve stop ID (handles both real IDs and station names)
    stopId = await resolveStopId(stopId);

    const data = await fetchStopTimes(stopId, n, ['TRANSIT']);
    const stopTimes: any[] = data.stopTimes || [];

    const departures = stopTimes
      .filter((st: any) => {
        if (!filterDest) return true;
        const headsign = (st.headsign || '').toLowerCase();
        const dest = filterDest.toLowerCase();
        return headsign.includes(dest) || headsign.includes("king's cross") || headsign.includes('kings cross') || headsign.includes('london');
      })
      .map((st: any) => {
        const place = st.place || {};
        const departure = place.departure || '';
        const scheduledDep = place.scheduledDeparture || departure;
        const delayMinutes = calcDelay(scheduledDep, departure);

        return {
          tripId: st.tripId || '',
          scheduledTime: formatTime(scheduledDep),
          estimatedTime: formatTime(departure),
          platform: place.track || place.scheduledTrack || '-',
          operator: st.agencyName || '',
          destination: st.headsign || '',
          headsign: st.headsign || '',
          isCancelled: st.cancelled || st.tripCancelled || false,
          delayMinutes,
          routeName: st.displayName || st.routeShortName || '',
          duration: 0,
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
