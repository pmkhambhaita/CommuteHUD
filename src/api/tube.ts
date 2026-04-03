import type { TubeResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchTubeArrivals(
  naptanId: string,
  lines: string[],
): Promise<TubeResponse> {
  const params = new URLSearchParams({ naptanId });
  if (lines.length > 0) params.set('lines', lines.join(','));
  const res = await fetch(`${API_BASE}/api/tube?${params}`);
  if (!res.ok) throw new Error(`Tube API error: ${res.status}`);
  return res.json();
}
