import type { DeparturesResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchDepartures(
  originCrs: string,
  destinationCrs: string,
): Promise<DeparturesResponse> {
  const params = new URLSearchParams({ origin: originCrs, destination: destinationCrs });
  const res = await fetch(`${API_BASE}/api/departures?${params}`);
  if (!res.ok) throw new Error(`Departures API error: ${res.status}`);
  return res.json();
}
