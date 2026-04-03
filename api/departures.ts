import { getDepartures } from './_lib/darwin';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get('origin') || 'SVG';
    const destination = url.searchParams.get('destination') || 'KGX';
    const apiKey = process.env.NATIONAL_RAIL_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NATIONAL_RAIL_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getDepartures(origin, destination, apiKey);

    // Enrich with journey type and duration estimates
    const departures = result.departures.map((d) => {
      const callingPointCount = 0; // We don't have details in board response
      const isFast = d.destination.toLowerCase().includes('kings cross') || d.destination.toLowerCase().includes("king's cross");
      const duration = isFast ? 22 : 35; // Approximate Stevenage to KGX times
      const [h, m] = (d.estimatedTime !== 'On time' && d.estimatedTime.includes(':')
        ? d.estimatedTime
        : d.scheduledTime
      ).split(':').map(Number);
      const arrH = h + Math.floor((m + duration) / 60);
      const arrM = (m + duration) % 60;
      const estimatedArrival = `${String(arrH % 24).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;

      return {
        ...d,
        journeyType: isFast ? 'Fast' : 'Stops' as const,
        duration,
        estimatedArrival,
      };
    });

    return new Response(JSON.stringify({
      departures,
      generatedAt: result.generatedAt,
      station: origin,
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
