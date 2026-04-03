const DARWIN_ENDPOINT = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx';

function buildSoapEnvelope(body: string, apiKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types"
  xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${apiKey}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

async function soapRequest(body: string, apiKey: string): Promise<string> {
  const envelope = buildSoapEnvelope(body, apiKey);
  const res = await fetch(DARWIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '',
    },
    body: envelope,
  });
  if (!res.ok) {
    throw new Error(`Darwin SOAP error: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ── XML parsing helpers ──

function extractTag(xml: string, tag: string): string | null {
  // Handle namespaced tags like <lt7:std>
  const regex = new RegExp(`<[^>]*?${tag}[^>]*?>([\\s\\S]*?)<\\/[^>]*?${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<[^>]*?${tag}[^>]*?>([\\s\\S]*?)<\\/[^>]*?${tag}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function extractAllBlocks(xml: string, tag: string): string[] {
  const regex = new RegExp(`<[^>]*?${tag}[^>]*?>[\\s\\S]*?<\\/[^>]*?${tag}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0]);
  }
  return results;
}

// ── Public API ──

export interface DarwinDeparture {
  serviceId: string;
  scheduledTime: string;
  estimatedTime: string;
  platform: string;
  operator: string;
  destination: string;
  isCancelled: boolean;
  delayMinutes: number;
}

export async function getDepartures(
  originCrs: string,
  destinationCrs: string,
  apiKey: string,
): Promise<{ departures: DarwinDeparture[]; generatedAt: string }> {
  const body = `<ldb:GetDepBoardWithDetailsRequest>
      <ldb:numRows>6</ldb:numRows>
      <ldb:crs>${originCrs}</ldb:crs>
      <ldb:filterCrs>${destinationCrs}</ldb:filterCrs>
      <ldb:filterType>to</ldb:filterType>
    </ldb:GetDepBoardWithDetailsRequest>`;

  const xml = await soapRequest(body, apiKey);
  const generatedAt = extractTag(xml, 'generatedAt') || new Date().toISOString();
  const services = extractAllBlocks(xml, 'service');

  const departures: DarwinDeparture[] = services.map((svc) => {
    const std = extractTag(svc, 'std') || '';
    const etd = extractTag(svc, 'etd') || '';
    const platform = extractTag(svc, 'platform') || '-';
    const operator = extractTag(svc, 'operator') || '';
    const serviceIdRaw = extractTag(svc, 'serviceID') || extractTag(svc, 'serviceId') || '';
    const isCancelled = etd.toLowerCase() === 'cancelled';

    // Destination name
    const destBlock = extractTag(svc, 'destination');
    const destination = destBlock ? (extractTag(destBlock, 'locationName') || '') : '';

    // Calculate delay
    let delayMinutes = 0;
    if (!isCancelled && etd !== 'On time' && etd.includes(':')) {
      const [sh, sm] = std.split(':').map(Number);
      const [eh, em] = etd.split(':').map(Number);
      delayMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }

    return {
      serviceId: encodeURIComponent(serviceIdRaw),
      scheduledTime: std,
      estimatedTime: etd,
      platform,
      operator,
      destination,
      isCancelled,
      delayMinutes,
    };
  });

  return { departures: departures.slice(0, 6), generatedAt };
}

export interface DarwinCallingPoint {
  station: string;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  isCancelled: boolean;
}

export interface DarwinServiceDetail {
  operator: string;
  scheduledDeparture: string;
  estimatedDeparture: string;
  scheduledArrival: string;
  estimatedArrival: string;
  platform: string;
  isCancelled: boolean;
  delayMinutes: number;
  disruptionReason: string | null;
  coachCount: number | null;
  callingPoints: DarwinCallingPoint[];
  route: string;
}

export async function getServiceDetail(
  serviceId: string,
  apiKey: string,
): Promise<DarwinServiceDetail> {
  const body = `<ldb:GetServiceDetailsRequest>
      <ldb:serviceID>${decodeURIComponent(serviceId)}</ldb:serviceID>
    </ldb:GetServiceDetailsRequest>`;

  const xml = await soapRequest(body, apiKey);

  const operator = extractTag(xml, 'operator') || '';
  const std = extractTag(xml, 'std') || '';
  const etd = extractTag(xml, 'etd') || '';
  const sta = extractTag(xml, 'sta') || '';
  const eta = extractTag(xml, 'eta') || '';
  const platform = extractTag(xml, 'platform') || '-';
  const isCancelled = (etd || '').toLowerCase() === 'cancelled' || (eta || '').toLowerCase() === 'cancelled';
  const disruptionReason = extractTag(xml, 'delayReason') || extractTag(xml, 'cancelReason') || null;
  const lengthStr = extractTag(xml, 'length');
  const coachCount = lengthStr ? parseInt(lengthStr, 10) : null;

  // Calculate delay
  let delayMinutes = 0;
  if (!isCancelled && etd && etd !== 'On time' && etd.includes(':')) {
    const [sh, sm] = std.split(':').map(Number);
    const [eh, em] = etd.split(':').map(Number);
    delayMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }

  // Calling points
  const cpBlocks = extractAllBlocks(xml, 'callingPoint');
  const callingPoints: DarwinCallingPoint[] = cpBlocks.map((cp) => {
    const station = extractTag(cp, 'locationName') || '';
    const st = extractTag(cp, 'st') || '';
    const et = extractTag(cp, 'et') || '';
    const cpCancelled = et.toLowerCase() === 'cancelled';
    let cpDelay = 0;
    if (!cpCancelled && et !== 'On time' && et.includes(':')) {
      const [sch, scm] = st.split(':').map(Number);
      const [ech, ecm] = et.split(':').map(Number);
      cpDelay = Math.max(0, (ech * 60 + ecm) - (sch * 60 + scm));
    }
    return { station, scheduledTime: st, estimatedTime: et, delayMinutes: cpDelay, isCancelled: cpCancelled };
  });

  // Route: origin → destination
  const origin = extractTag(xml, 'locationName') || '';
  const destBlock = extractAllBlocks(xml, 'destination');
  const destName = destBlock.length > 0 ? (extractTag(destBlock[0], 'locationName') || '') : '';
  const route = `${origin} → ${destName}`;

  return {
    operator,
    scheduledDeparture: std,
    estimatedDeparture: etd,
    scheduledArrival: sta,
    estimatedArrival: eta,
    platform,
    isCancelled,
    delayMinutes,
    disruptionReason,
    coachCount,
    callingPoints,
    route,
  };
}
