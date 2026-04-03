// ── Shared types used across all layers ──

export interface Departure {
  serviceId: string;
  scheduledTime: string; // HH:MM
  estimatedTime: string; // HH:MM or "On time" or "Cancelled" or "Delayed"
  platform: string;
  operator: string;
  destination: string;
  isCancelled: boolean;
  delayMinutes: number;
  journeyType: 'Fast' | 'Stops';
  duration: number; // minutes
  estimatedArrival: string; // HH:MM
}

export interface CallingPoint {
  station: string;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  isCancelled: boolean;
}

export interface ServiceDetail {
  serviceId: string;
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
  callingPoints: CallingPoint[];
  route: string;
}

export interface TubeArrival {
  lineId: string;
  lineName: string;
  destinationName: string;
  platformName: string;
  timeToStation: number; // seconds
  currentLocation: string;
}

export interface TubeLineArrivals {
  lineId: string;
  lineName: string;
  arrivals: TubeArrival[];
}

export interface DeparturesResponse {
  departures: Departure[];
  generatedAt: string;
  station: string;
}

export interface ServiceResponse {
  service: ServiceDetail;
}

export interface TubeResponse {
  lines: TubeLineArrivals[];
  generatedAt: string;
  station: string;
}

// ── Journey state machine ──

export type JourneyPhase = 'idle' | 'at_station' | 'on_train' | 'approaching' | 'transfer';

export type ScreenId = 'splash' | 'departure_board' | 'train_detail' | 'journey_active' | 'disruption_alert' | 'tube_board';

export interface ActiveJourney {
  serviceId: string;
  departure: Departure;
  serviceDetail: ServiceDetail | null;
  departureTime: number; // epoch ms
  arrivalTime: number; // epoch ms
  phase: JourneyPhase;
  cancelConfirmPending: boolean;
}

export interface DisruptionInfo {
  serviceId: string;
  delayMinutes: number;
  isCancelled: boolean;
  reason: string | null;
  acknowledgedDelayMinutes: number;
}

// ── Settings ──

export interface UserSettings {
  origin: string;
  originCrs: string;
  destination: string;
  destinationCrs: string;
  tubeLines: string[];
  tubeStationNaptan: string;
  disruptionThreshold: number; // minutes
  pollingIntervalDepartures: number; // ms
  pollingIntervalService: number; // ms
  pollingIntervalTube: number; // ms
}

export const DEFAULT_SETTINGS: UserSettings = {
  origin: 'Stevenage',
  originCrs: 'SVG',
  destination: 'London Kings Cross',
  destinationCrs: 'KGX',
  tubeLines: ['northern', 'piccadilly', 'victoria', 'metropolitan', 'hammersmith-city', 'circle'],
  tubeStationNaptan: '940GZZLUKSX',
  disruptionThreshold: 3,
  pollingIntervalDepartures: 30000,
  pollingIntervalService: 180000,
  pollingIntervalTube: 15000,
};
