import { useEffect, useRef, useCallback } from 'react';
import {
  waitForEvenAppBridge,
  EvenAppBridge,
  OsEventTypeList,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk';
import { useJourneyStore } from '../store/useJourneyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useDisruptionStore } from '../store/useDisruptionStore';
import { getContainers, getUpdates, handleAction } from './glassRouter';
import type { AppSnapshot, AppAction, StoreAction } from './shared';
import type { ScreenId } from '../types';
import { fetchDepartures } from '../api/departures';
import { fetchServiceDetail } from '../api/service';
import { fetchTubeArrivals } from '../api/tube';
import { hhmmToEpoch } from '../utils/time';
import {
  POLL_DEPARTURES,
  POLL_DEPARTURES_ACTIVE,
  POLL_SERVICE,
  POLL_TUBE,
  POLL_TUBE_APPROACHING,
  POLL_BACKGROUND,
} from '../utils/constants';

// ── Build snapshot from stores ──
function buildSnapshot(): AppSnapshot {
  const j = useJourneyStore.getState();
  const s = useSettingsStore.getState();
  const d = useDisruptionStore.getState();

  return {
    screen: j.screen,
    departures: j.departures,
    highlightedIndex: j.highlightedIndex,
    lastRefresh: j.lastRefresh,
    selectedDeparture: j.selectedDeparture,
    serviceDetail: j.serviceDetail,
    detailScrollPos: j.detailScrollPos,
    activeJourney: j.activeJourney,
    tubeLines: j.tubeLines,
    tubeLastRefresh: j.tubeLastRefresh,
    disruption: d.disruption,
    routeLabel: `${s.origin} → KGX`,
    isLoading: j.isLoading,
    isForeground: j.isForeground,
    error: j.error,
  };
}

export default function AppGlasses() {
  const bridgeRef = useRef<EvenAppBridge | null>(null);
  const currentScreenRef = useRef<ScreenId>('splash');
  const intervalsRef = useRef<number[]>([]);
  const initRef = useRef(false);

  // ── Interval management ──
  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const addInterval = useCallback((fn: () => void, ms: number) => {
    intervalsRef.current.push(window.setInterval(fn, ms));
  }, []);

  // ── API fetchers ──
  const refreshDepartures = useCallback(async () => {
    const s = useSettingsStore.getState();
    const j = useJourneyStore.getState();
    const d = useDisruptionStore.getState();
    try {
      const data = await fetchDepartures(s.originStopId, s.destination);
      j.setDepartures(data.departures, data.generatedAt);

      // Disruption check on active journey
      if (j.activeJourney) {
        const activeDep = data.departures.find(
          (dep) => dep.tripId === j.activeJourney!.tripId,
        );
        if (activeDep && d.shouldAlert(
          activeDep.tripId, activeDep.delayMinutes,
          activeDep.isCancelled, s.disruptionThreshold,
        )) {
          d.setDisruption({
            tripId: activeDep.tripId,
            delayMinutes: activeDep.delayMinutes,
            isCancelled: activeDep.isCancelled,
            reason: null,
            acknowledgedDelayMinutes: d.disruption?.acknowledgedDelayMinutes || 0,
          });
          useJourneyStore.getState().setScreen('disruption_alert');
        }
      }
    } catch (err: any) {
      console.error('Departures fetch failed:', err);
      j.setError(`No connection · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
    }
  }, []);

  const refreshService = useCallback(async () => {
    const j = useJourneyStore.getState();
    const tripId = j.selectedDeparture?.tripId || j.activeJourney?.tripId;
    if (!tripId) return;
    try {
      const data = await fetchServiceDetail(tripId);
      if (j.screen === 'train_detail') j.setServiceDetail(data.service);
      if (j.activeJourney) j.updateActiveServiceDetail(data.service);
    } catch (err) {
      console.error('Service fetch failed:', err);
    }
  }, []);

  const refreshTube = useCallback(async () => {
    const s = useSettingsStore.getState();
    try {
      const data = await fetchTubeArrivals(s.tubeStationStopId, s.tubeLines);
      useJourneyStore.getState().setTubeLines(data.lines, data.generatedAt);
    } catch (err) {
      console.error('Tube fetch failed:', err);
    }
  }, []);

  // ── Polling setup based on current state ──
  const setupPolling = useCallback(() => {
    clearIntervals();
    const j = useJourneyStore.getState();

    if (!j.isForeground) {
      addInterval(refreshDepartures, POLL_BACKGROUND);
      return;
    }

    const phase = j.activeJourney?.phase;

    switch (j.screen) {
      case 'departure_board':
        addInterval(refreshDepartures, POLL_DEPARTURES);
        break;
      case 'train_detail':
        addInterval(refreshDepartures, POLL_DEPARTURES);
        addInterval(refreshService, POLL_SERVICE);
        break;
      case 'journey_active':
        if (phase === 'at_station') {
          addInterval(refreshDepartures, POLL_DEPARTURES_ACTIVE);
          addInterval(() => useJourneyStore.getState().updateJourneyPhase(), 30000);
        } else if (phase === 'on_train') {
          addInterval(refreshService, POLL_SERVICE);
          addInterval(() => useJourneyStore.getState().updateJourneyPhase(), 60000);
        } else if (phase === 'approaching') {
          addInterval(refreshTube, POLL_TUBE_APPROACHING);
          addInterval(() => useJourneyStore.getState().updateJourneyPhase(), 20000);
        } else if (phase === 'transfer') {
          addInterval(refreshTube, POLL_TUBE);
          addInterval(() => useJourneyStore.getState().updateJourneyPhase(), 15000);
        }
        break;
      case 'tube_board':
        addInterval(refreshTube, POLL_TUBE);
        break;
    }
  }, [clearIntervals, addInterval, refreshDepartures, refreshService, refreshTube]);

  // ── Display updates ──
  const updateDisplay = useCallback(async (forceRebuild: boolean = false) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const snapshot = buildSnapshot();

    if (forceRebuild || currentScreenRef.current !== snapshot.screen) {
      // Screen changed → full rebuild
      currentScreenRef.current = snapshot.screen;
      const containers = getContainers(snapshot);
      await bridge.rebuildPageContainer(new RebuildPageContainer({
        containerTotalNum: containers.length,
        textObject: containers,
      }));
    } else {
      // Same screen → in-place text updates (no flicker)
      const updates = getUpdates(snapshot);
      for (const u of updates) {
        await bridge.textContainerUpgrade(new TextContainerUpgrade({
          containerID: u.containerID,
          containerName: u.containerName,
          content: u.content,
          contentOffset: 0,
          contentLength: u.content.length,
        }));
      }
    }
  }, []);

  // ── Store action dispatcher ──
  const dispatch = useCallback((action: StoreAction) => {
    const j = useJourneyStore.getState();
    const d = useDisruptionStore.getState();

    switch (action.type) {
      case 'MOVE_HIGHLIGHT':
        j.moveHighlight(action.direction);
        break;
      case 'SELECT_DEPARTURE':
        j.selectDeparture(action.departure);
        refreshService();
        break;
      case 'FORCE_REFRESH':
        refreshDepartures();
        break;
      case 'FORCE_REFRESH_TUBE':
        refreshTube();
        break;
      case 'SCROLL_DETAIL':
        j.scrollDetail(
          action.direction,
          Math.max(0, (j.serviceDetail?.callingPoints.length || 0) - 4),
        );
        break;
      case 'START_JOURNEY': {
        const dep = j.selectedDeparture;
        const detail = j.serviceDetail;
        if (dep && detail) {
          const estDep = detail.estimatedDeparture !== detail.scheduledDeparture
            ? detail.estimatedDeparture : detail.scheduledDeparture;
          const estArr = detail.estimatedArrival !== detail.scheduledArrival
            ? detail.estimatedArrival : detail.scheduledArrival;
          j.startJourney(dep, detail, hhmmToEpoch(estDep), hhmmToEpoch(estArr));
          refreshTube();
        }
        break;
      }
      case 'TOGGLE_CANCEL_CONFIRM':
        j.setCancelConfirm(!j.activeJourney?.cancelConfirmPending);
        break;
      case 'CONFIRM_CANCEL':
        j.cancelJourney();
        break;
      case 'DISMISS_DISRUPTION':
        if (d.disruption) d.acknowledge(d.disruption.tripId, d.disruption.delayMinutes);
        d.dismiss();
        j.setScreen(j.previousScreen || 'journey_active');
        break;
      case 'DISMISS_AND_SHOW_ALTERNATIVES':
        if (d.disruption) d.acknowledge(d.disruption.tripId, d.disruption.delayMinutes);
        d.dismiss();
        j.setScreen('departure_board');
        break;
    }

    setTimeout(() => updateDisplay(), 50);
  }, [refreshDepartures, refreshService, refreshTube, updateDisplay]);

  // ── Screen navigator ──
  const navigate = useCallback((screen: ScreenId) => {
    useJourneyStore.getState().setScreen(screen);
    setupPolling();
    setTimeout(() => updateDisplay(true), 50);
  }, [setupPolling, updateDisplay]);

  // ── Event handler ──
  const handleEvent = useCallback((event: any) => {
    const j = useJourneyStore.getState();

    // System events
    if (event.sysEvent) {
      const t = event.sysEvent.eventType;
      if (t === OsEventTypeList.FOREGROUND_ENTER_EVENT || t === 4) {
        j.setForeground(true);
        setupPolling();
        refreshDepartures();
        updateDisplay(true);
        return;
      }
      if (t === OsEventTypeList.FOREGROUND_EXIT_EVENT || t === 5) {
        j.setForeground(false);
        setupPolling(); // Switches to background polling
        return;
      }
      if (t === OsEventTypeList.ABNORMAL_EXIT_EVENT || t === 6) {
        // State persisted via zustand persist — will resume on reconnect
        return;
      }
    }

    // Text input events
    if (event.textEvent) {
      const snapshot = buildSnapshot();
      const et = event.textEvent.eventType;
      let action: AppAction;

      if (et === OsEventTypeList.SCROLL_TOP_EVENT || et === 1) {
        action = { type: 'SCROLL_UP' };
      } else if (et === OsEventTypeList.SCROLL_BOTTOM_EVENT || et === 2) {
        action = { type: 'SCROLL_DOWN' };
      } else if (et === OsEventTypeList.DOUBLE_CLICK_EVENT || et === 3) {
        action = { type: 'BACK' };
      } else {
        // CLICK_EVENT: 0 or undefined
        action = { type: 'SELECT' };
      }

      handleAction(action, snapshot, dispatch, navigate, j.previousScreen);
    }
  }, [dispatch, navigate, setupPolling, refreshDepartures, updateDisplay]);

  // ── Init ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        await waitForEvenAppBridge();
        const bridge = EvenAppBridge.getInstance();
        bridgeRef.current = bridge;

        // Register event listener
        bridge.onEvenHubEvent(handleEvent);

        // Create initial splash page
        const snapshot = buildSnapshot();
        const containers = getContainers(snapshot);
        const result = await bridge.createStartUpPageContainer(
          new CreateStartUpPageContainer({
            containerTotalNum: containers.length,
            textObject: containers,
          }),
        );
        if (result !== 0) {
          console.error('createStartUpPageContainer failed with code:', result);
        }

        // Fetch initial data
        await refreshDepartures();
        setupPolling();

        // Subscribe to store changes → update glass display
        useJourneyStore.subscribe(() => updateDisplay());
      } catch (err) {
        console.error('Glass bridge init failed:', err);
      }
    })();

    return () => clearIntervals();
  }, [handleEvent, refreshDepartures, setupPolling, updateDisplay, clearIntervals]);

  // Invisible component — only manages the bridge
  return null;
}
