import type { ServiceResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchServiceDetail(serviceId: string): Promise<ServiceResponse> {
  const res = await fetch(`${API_BASE}/api/service/${serviceId}`);
  if (!res.ok) throw new Error(`Service API error: ${res.status}`);
  return res.json();
}
