import {
  splashScreen,
  departureBoardScreen,
  trainDetailScreen,
  journeyActiveScreen,
  disruptionAlertScreen,
  tubeBoardScreen,
} from './screens';
import type { AppSnapshot, AppAction, ScreenContext, StoreAction } from './shared';
import type { ScreenId } from '../types';

interface GlassScreen {
  containers: (snapshot: AppSnapshot) => any[];
  updates: (snapshot: AppSnapshot) => { containerID: number; containerName: string; content: string }[];
  action: (action: AppAction, snapshot: AppSnapshot, ctx: ScreenContext) => void;
}

const screensMap: Record<ScreenId, GlassScreen> = {
  splash: splashScreen,
  departure_board: departureBoardScreen,
  train_detail: trainDetailScreen,
  journey_active: journeyActiveScreen,
  disruption_alert: disruptionAlertScreen,
  tube_board: tubeBoardScreen,
};

export function getScreen(id: ScreenId): GlassScreen {
  return screensMap[id] || screensMap.splash;
}

export function getContainers(snapshot: AppSnapshot) {
  return getScreen(snapshot.screen).containers(snapshot);
}

export function getUpdates(snapshot: AppSnapshot) {
  return getScreen(snapshot.screen).updates(snapshot);
}

export function handleAction(
  action: AppAction,
  snapshot: AppSnapshot,
  dispatch: (a: StoreAction) => void,
  navigate: (screen: ScreenId) => void,
  previousScreen: ScreenId | null,
) {
  const ctx: ScreenContext = { dispatch, navigate, previousScreen };
  getScreen(snapshot.screen).action(action, snapshot, ctx);
}
