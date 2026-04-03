import {
  splashScreen,
  departureBoardScreen,
  trainDetailScreen,
  journeyActiveScreen,
  disruptionAlertScreen,
  tubeBoardScreen,
} from './screens';
import type { AppSnapshot, AppAction } from './shared';
import type { ScreenId } from '../types';

export interface GlassScreenDef {
  containers: (snapshot: AppSnapshot) => any[];
  updates: (snapshot: AppSnapshot) => { containerID: number; containerName: string; content: string }[];
  action: (action: AppAction, nav: any, snapshot: AppSnapshot, ctx: any) => any;
}

const screensMap: Record<ScreenId, GlassScreenDef> = {
  splash: splashScreen,
  departure_board: departureBoardScreen,
  train_detail: trainDetailScreen,
  journey_active: journeyActiveScreen,
  disruption_alert: disruptionAlertScreen,
  tube_board: tubeBoardScreen,
};

export interface GlassRouterResult {
  containers: any[];
  updates: { containerID: number; containerName: string; content: string }[];
}

export function getScreenDef(screenId: ScreenId): GlassScreenDef {
  return screensMap[screenId] || screensMap.splash;
}

export function toDisplayData(snapshot: AppSnapshot): GlassRouterResult {
  const screen = getScreenDef(snapshot.screen);
  return {
    containers: screen.containers(snapshot),
    updates: screen.updates(snapshot),
  };
}

export function handleGlassAction(
  action: AppAction,
  snapshot: AppSnapshot,
  dispatch: (action: any) => void,
  navigate: (screen: ScreenId) => void,
  previousScreen: ScreenId | null,
) {
  const screen = getScreenDef(snapshot.screen);
  const ctx = {
    dispatch,
    navigate,
    previousScreen,
  };
  screen.action(action, {}, snapshot, ctx);
}
