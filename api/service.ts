import { getServiceDetail } from './_lib/darwin';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const serviceId = pathParts[pathParts.length - 1];

    if (!serviceId) {
      return new Response(JSON.stringify({ error: 'serviceId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.NATIONAL_RAIL_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NATIONAL_RAIL_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const service = await getServiceDetail(serviceId, apiKey);

    return new Response(JSON.stringify({
      service: {
        serviceId,
        ...service,
      },
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
