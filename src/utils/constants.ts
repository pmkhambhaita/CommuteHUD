// Display dimensions
export const DISPLAY_WIDTH = 576;
export const DISPLAY_HEIGHT = 288;

// Container layout
export const HEADER_HEIGHT = 28;
export const BODY_Y = HEADER_HEIGHT;
export const BODY_HEIGHT = DISPLAY_HEIGHT - HEADER_HEIGHT;
export const ACTION_BAR_HEIGHT = 24;

// Polling intervals (ms)
export const POLL_DEPARTURES = 30000;
export const POLL_DEPARTURES_ACTIVE = 60000;
export const POLL_SERVICE = 180000;
export const POLL_TUBE = 15000;
export const POLL_TUBE_APPROACHING = 20000;
export const POLL_BACKGROUND = 180000;

// Journey thresholds
export const APPROACHING_MINUTES = 10;
export const TRANSFER_TIMEOUT_MINUTES = 20;

// Tube station
export const KGX_NAPTAN = '940GZZLUKSX';

// Station CRS codes
export const STEVENAGE_CRS = 'SVG';
export const KINGS_CROSS_CRS = 'KGX';

// Screen IDs
export const SCREEN = {
  SPLASH: 'splash',
  DEPARTURE_BOARD: 'departure_board',
  TRAIN_DETAIL: 'train_detail',
  JOURNEY_ACTIVE: 'journey_active',
  DISRUPTION_ALERT: 'disruption_alert',
  TUBE_BOARD: 'tube_board',
} as const;
