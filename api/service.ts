import { fetchTrip } from './_lib/transitous';

export const config = { runtime: 'edge' };

function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
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
    const pathParts = url.pathname.split('/');
    const tripId = decodeURIComponent(pathParts[pathParts.length - 1]);

    if (!tripId) {
      return new Response(JSON.stringify({ error: 'tripId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const itinerary = await fetchTrip(tripId);

    // The trip endpoint returns an Itinerary with legs
    const legs: any[] = itinerary.legs || [];
    const transitLeg = legs.find((l: any) => l.mode === 'RAIL' || l.mode === 'SUBURBAN') || legs[0];

    if (!transitLeg) {
      return new Response(JSON.stringify({ error: 'No transit leg found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const depTime = transitLeg.departure || '';
    const arrTime = transitLeg.arrival || '';
    const schedDep = transitLeg.scheduledDeparture || depTime;
    const schedArr = transitLeg.scheduledArrival || arrTime;
    const delayMinutes = calcDelay(schedDep, depTime);

    // Build calling points from intermediate stops
    const intermediateStops: any[] = transitLeg.intermediateStops || [];
    const callingPoints = intermediateStops.map((stop: any) => {
      const place = stop.place || stop;
      const name = place.name || stop.name || '';
      const cpArr = place.arrival || stop.arrival || '';
      const cpSchedArr = place.scheduledArrival || stop.scheduledArrival || cpArr;
      const cpDelay = calcDelay(cpSchedArr, cpArr);
      const platform = place.track || stop.track || place.scheduledTrack || stop.scheduledTrack || '';
      return {
        station: name,
        scheduledTime: formatTime(cpSchedArr),
        estimatedTime: formatTime(cpArr),
        delayMinutes: cpDelay,
        isCancelled: place.cancelled || stop.cancelled || false,
        platform,
      };
    });

    // Check for alerts/disruptions
    const alerts: any[] = itinerary.alerts || transitLeg.from?.alerts || [];
    const disruptionReason = alerts.length > 0
      ? alerts.map((a: any) => a.headerText || a.descriptionText).join('; ')
      : null;

    const service = {
      tripId,
      operator: transitLeg.agencyName || '',
      routeName: transitLeg.displayName || transitLeg.routeShortName || transitLeg.routeLongName || '',
      headsign: transitLeg.headsign || '',
      scheduledDeparture: formatTime(schedDep),
      estimatedDeparture: formatTime(depTime),
      scheduledArrival: formatTime(schedArr),
      estimatedArrival: formatTime(arrTime),
      platform: transitLeg.track || transitLeg.scheduledTrack || transitLeg.from?.track || '-',
      isCancelled: false,
      delayMinutes,
      disruptionReason,
      callingPoints,
      mode: transitLeg.mode || 'RAIL',
    };

    return new Response(JSON.stringify({ service }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=10' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
