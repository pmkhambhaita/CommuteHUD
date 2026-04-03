import type {
  Departure,
  ServiceDetail,
  TubeLineArrivals,
  JourneyPhase,
  ScreenId,
  DisruptionInfo,
} from '../types';

/** Snapshot of all data the glass screens need — derived from Zustand stores */
export interface AppSnapshot {
  // Current screen
  screen: ScreenId;

  // Departure board
  departures: Departure[];
  highlightedIndex: number;
  lastRefresh: string | null;

  // Train detail
  selectedDeparture: Departure | null;
  serviceDetail: ServiceDetail | null;
  detailScrollPos: number;

  // Active journey
  activeJourney: {
    serviceId: string;
    departure: Departure;
    serviceDetail: ServiceDetail | null;
    departureTime: number;
    arrivalTime: number;
    phase: JourneyPhase;
    cancelConfirmPending: boolean;
  } | null;

  // Tube data
  tubeLines: TubeLineArrivals[];
  tubeLastRefresh: string | null;

  // Disruption
  disruption: DisruptionInfo | null;

  // Settings
  routeLabel: string;
  tubeLineIds: string[];

  // Loading states
  isLoading: boolean;
  isForeground: boolean;
}

/** All possible user input actions dispatched from glass events */
export type AppAction =
  | { type: 'SCROLL_UP' }
  | { type: 'SCROLL_DOWN' }
  | { type: 'SELECT' }
  | { type: 'BACK' }
  | { type: 'REFRESH' }
  | { type: 'FOREGROUND_ENTER' }
  | { type: 'FOREGROUND_EXIT' }
  | { type: 'ABNORMAL_EXIT' }
  | { type: 'DISMISS_DISRUPTION' }
  | { type: 'VIEW_ALTERNATIVES' };
