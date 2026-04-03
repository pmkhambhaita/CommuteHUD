import type { ServiceDetail } from '../types';
import { TRANSITOUS_BASE } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface ServiceResponse {
  service: ServiceDetail;
}

export async function fetchServiceDetail(tripId: string): Promise<ServiceResponse> {
  const useProxy = !!API_BASE;
  if (useProxy) {
    const res = await fetch(`${API_BASE}/api/service/${encodeURIComponent(tripId)}`);
    if (!res.ok) throw new Error(`Service API error: ${res.status}`);
    return res.json();
  }

  // Direct Transitous call
  const params = new URLSearchParams({ tripId });
  const res = await fetch(`${TRANSITOUS_BASE}/api/v5/trip?${params}`);
  if (!res.ok) throw new Error(`Transitous trip error: ${res.status}`);
  const itinerary = await res.json();

  const legs: any[] = itinerary.legs || [];
  const leg = legs.find((l: any) => l.mode === 'RAIL' || l.mode === 'SUBURBAN') || legs[0];
  if (!leg) throw new Error('No transit leg found');

  const depTime = leg.departure || '';
  const arrTime = leg.arrival || '';
  const schedDep = leg.scheduledDeparture || depTime;
  const schedArr = leg.scheduledArrival || arrTime;
  const delay = calcDelay(schedDep, depTime);

  const intermediateStops: any[] = leg.intermediateStops || [];
  const callingPoints = intermediateStops.map((stop: any) => {
    const p = stop.place || stop;
    const cpArr = p.arrival || stop.arrival || '';
    const cpSchedArr = p.scheduledArrival || stop.scheduledArrival || cpArr;
    return {
      station: p.name || stop.name || '',
      scheduledTime: fmtTime(cpSchedArr),
      estimatedTime: fmtTime(cpArr),
      delayMinutes: calcDelay(cpSchedArr, cpArr),
      isCancelled: p.cancelled || stop.cancelled || false,
      platform: p.track || stop.track || '',
    };
  });

  const alerts: any[] = itinerary.alerts || leg.from?.alerts || [];
  const disruptionReason = alerts.length > 0
    ? alerts.map((a: any) => a.headerText || a.descriptionText).join('; ')
    : null;

  return {
    service: {
      tripId,
      operator: leg.agencyName || '',
      routeName: leg.displayName || leg.routeShortName || leg.routeLongName || '',
      headsign: leg.headsign || '',
      scheduledDeparture: fmtTime(schedDep),
      estimatedDeparture: fmtTime(depTime),
      scheduledArrival: fmtTime(schedArr),
      estimatedArrival: fmtTime(arrTime),
      platform: leg.track || leg.scheduledTrack || leg.from?.track || '-',
      isCancelled: false,
      delayMinutes: delay,
      disruptionReason,
      callingPoints,
      mode: leg.mode || 'RAIL',
    },
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
