const TFL_BASE = 'https://api.tfl.gov.uk';

export interface TflArrival {
  lineId: string;
  lineName: string;
  destinationName: string;
  platformName: string;
  timeToStation: number;
  currentLocation: string;
}

export async function getTubeArrivals(
  naptanId: string,
  appKey: string,
): Promise<TflArrival[]> {
  const url = `${TFL_BASE}/StopPoint/${naptanId}/Arrivals?app_key=${encodeURIComponent(appKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TfL API error: ${res.status} ${res.statusText}`);
  }
  const data: any[] = await res.json();

  return data.map((a) => ({
    lineId: a.lineId || '',
    lineName: a.lineName || '',
    destinationName: a.destinationName || '',
    platformName: a.platformName || '',
    timeToStation: a.timeToStation || 0,
    currentLocation: a.currentLocation || '',
  }));
}

export interface TubeLineGroup {
  lineId: string;
  lineName: string;
  arrivals: TflArrival[];
}

export function groupByLine(arrivals: TflArrival[]): TubeLineGroup[] {
  const map = new Map<string, TubeLineGroup>();
  for (const a of arrivals) {
    if (!map.has(a.lineId)) {
      map.set(a.lineId, { lineId: a.lineId, lineName: a.lineName, arrivals: [] });
    }
    map.get(a.lineId)!.arrivals.push(a);
  }
  // Sort arrivals within each line by time
  for (const group of map.values()) {
    group.arrivals.sort((a, b) => a.timeToStation - b.timeToStation);
  }
  return Array.from(map.values()).sort((a, b) => a.lineName.localeCompare(b.lineName));
}
