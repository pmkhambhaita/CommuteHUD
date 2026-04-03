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
    tripId: string;
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

  // Status
  isLoading: boolean;
  isForeground: boolean;
  error: string | null;
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
  | { type: 'ABNORMAL_EXIT' };

/** Store actions dispatched from glass screen handlers */
export type StoreAction =
  | { type: 'MOVE_HIGHLIGHT'; direction: 'up' | 'down' }
  | { type: 'SELECT_DEPARTURE'; departure: Departure }
  | { type: 'FORCE_REFRESH' }
  | { type: 'FORCE_REFRESH_TUBE' }
  | { type: 'SCROLL_DETAIL'; direction: 'up' | 'down' }
  | { type: 'START_JOURNEY' }
  | { type: 'TOGGLE_CANCEL_CONFIRM' }
  | { type: 'CONFIRM_CANCEL' }
  | { type: 'DISMISS_DISRUPTION' }
  | { type: 'DISMISS_AND_SHOW_ALTERNATIVES' };

export interface ScreenContext {
  dispatch: (action: StoreAction) => void;
  navigate: (screen: ScreenId) => void;
  previousScreen: ScreenId | null;
}
