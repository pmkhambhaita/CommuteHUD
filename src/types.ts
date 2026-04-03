// ── Shared types used across all layers ──

// ── Transitous/MOTIS response types ──

export interface TransitousPlace {
  name: string;
  lat: number;
  lon: number;
  level: number;
  stopId?: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  scheduledTrack?: string;
  track?: string;
  cancelled?: boolean;
  alerts?: TransitousAlert[];
}

export interface TransitousAlert {
  headerText: string;
  descriptionText: string;
  cause?: string;
  effect?: string;
  severityLevel?: string;
}

export interface TransitousStopTime {
  place: TransitousPlace;
  mode: string;
  realTime: boolean;
  headsign: string;
  agencyName: string;
  tripId: string;
  routeShortName: string;
  routeLongName: string;
  displayName: string;
  cancelled: boolean;
  tripCancelled: boolean;
  routeColor?: string;
  routeTextColor?: string;
}

export interface TransitousLeg {
  from: TransitousPlace;
  to: TransitousPlace;
  mode: string;
  departure: string;
  arrival: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  realTime: boolean;
  distance: number;
  duration: number; // seconds
  headsign?: string;
  tripId?: string;
  agencyName?: string;
  routeShortName?: string;
  routeLongName?: string;
  routeColor?: string;
  displayName?: string;
  intermediateStops?: TransitousIntermediateStop[];
  track?: string;
  scheduledTrack?: string;
}

export interface TransitousIntermediateStop {
  place?: TransitousPlace;
  name?: string;
  stopId?: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled?: boolean;
  realTime?: boolean;
}

export interface TransitousItinerary {
  startTime: string;
  endTime: string;
  duration: number; // seconds
  legs: TransitousLeg[];
  transfers: number;
  alerts?: TransitousAlert[];
}

// ── App-level types ──

export interface Departure {
  tripId: string;
  scheduledTime: string; // HH:MM
  estimatedTime: string; // HH:MM or same as scheduled
  platform: string;
  operator: string;
  destination: string;
  headsign: string;
  isCancelled: boolean;
  delayMinutes: number;
  routeName: string;
  duration: number; // minutes
  estimatedArrival: string; // HH:MM
  mode: string;
  intermediateStopCount: number;
}

export interface CallingPoint {
  station: string;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  isCancelled: boolean;
  platform: string;
}

export interface ServiceDetail {
  tripId: string;
  operator: string;
  routeName: string;
  headsign: string;
  scheduledDeparture: string;
  estimatedDeparture: string;
  scheduledArrival: string;
  estimatedArrival: string;
  platform: string;
  isCancelled: boolean;
  delayMinutes: number;
  disruptionReason: string | null;
  callingPoints: CallingPoint[];
  mode: string;
}

export interface TubeArrival {
  lineId: string;
  lineName: string;
  destination: string;
  platform: string;
  departureTime: string;
  delayMinutes: number;
  mode: string;
}

export interface TubeLineArrivals {
  lineId: string;
  lineName: string;
  arrivals: TubeArrival[];
}

// ── Journey state machine ──

export type JourneyPhase = 'idle' | 'at_station' | 'on_train' | 'approaching' | 'transfer';

export type ScreenId = 'splash' | 'departure_board' | 'train_detail' | 'journey_active' | 'disruption_alert' | 'tube_board';

export interface ActiveJourney {
  tripId: string;
  departure: Departure;
  serviceDetail: ServiceDetail | null;
  departureTime: number; // epoch ms
  arrivalTime: number; // epoch ms
  phase: JourneyPhase;
  cancelConfirmPending: boolean;
}

export interface DisruptionInfo {
  tripId: string;
  delayMinutes: number;
  isCancelled: boolean;
  reason: string | null;
  acknowledgedDelayMinutes: number;
}

// ── Settings ──

export interface UserSettings {
  origin: string;
  originStopId: string;
  destination: string;
  destinationStopId: string;
  tubeStationStopId: string;
  tubeLines: string[];
  disruptionThreshold: number; // minutes
}

// Default settings — stop IDs will be auto-resolved via geocode if they fail
export const DEFAULT_SETTINGS: UserSettings = {
  origin: 'Stevenage',
  originStopId: 'Stevenage', // Will auto-resolve via /api/v1/geocode
  destination: "London King's Cross",
  destinationStopId: "London King's Cross",
  tubeStationStopId: "King's Cross St. Pancras",
  tubeLines: ['victoria', 'piccadilly', 'northern', 'metropolitan', 'hammersmith-city', 'circle'],
  disruptionThreshold: 3,
};

// ── API base ──
export const TRANSITOUS_BASE = 'https://api.transitous.org';
