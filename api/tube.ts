import { getTubeArrivals, groupByLine } from './_lib/tfl';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const naptanId = url.searchParams.get('naptanId') || '940GZZLUKSX';
    const lines = url.searchParams.get('lines')?.split(',') || [];

    const appKey = process.env.TFL_APP_KEY;
    if (!appKey) {
      return new Response(JSON.stringify({ error: 'TFL_APP_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrivals = await getTubeArrivals(naptanId, appKey);

    // Filter by requested lines if specified
    const filtered = lines.length > 0
      ? arrivals.filter((a) => lines.includes(a.lineId))
      : arrivals;

    const grouped = groupByLine(filtered);

    // Map to response shape
    const responseLines = grouped.map((g) => ({
      lineId: g.lineId,
      lineName: g.lineName,
      arrivals: g.arrivals.slice(0, 5).map((a) => ({
        lineId: a.lineId,
        lineName: a.lineName,
        destinationName: a.destinationName,
        platformName: a.platformName,
        timeToStation: a.timeToStation,
        currentLocation: a.currentLocation,
      })),
    }));

    return new Response(JSON.stringify({
      lines: responseLines,
      generatedAt: new Date().toISOString(),
      station: naptanId,
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
