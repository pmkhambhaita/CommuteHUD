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
import { toDisplayData, handleGlassAction } from './glassRouter';
import type { AppSnapshot, AppAction } from './shared';
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
    routeLabel: `${s.origin} → ${s.destination}`,
    tubeLineIds: s.tubeLines,
    isLoading: j.isLoading,
    isForeground: j.isForeground,
  };
}

export default function AppGlasses() {
  const bridgeRef = useRef<EvenAppBridge | null>(null);
  const currentScreenRef = useRef<ScreenId>('splash');
  const intervalsRef = useRef<number[]>([]);
  const isInitRef = useRef(false);

  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const refreshDepartures = useCallback(async () => {
    const s = useSettingsStore.getState();
    const j = useJourneyStore.getState();
    const d = useDisruptionStore.getState();
    try {
      const data = await fetchDepartures(s.originCrs, s.destinationCrs);
      j.setDepartures(data.departures, data.generatedAt);

      // Check disruptions on active journey
      if (j.activeJourney) {
        const activeDep = data.departures.find(
          (dep) => dep.serviceId === j.activeJourney!.serviceId,
        );
        if (activeDep && d.shouldAlert(activeDep.serviceId, activeDep.delayMinutes, activeDep.isCancelled, s.disruptionThreshold)) {
          d.setDisruption({
            serviceId: activeDep.serviceId,
            delayMinutes: activeDep.delayMinutes,
            isCancelled: activeDep.isCancelled,
            reason: null,
            acknowledgedDelayMinutes: d.disruption?.acknowledgedDelayMinutes || 0,
          });
          useJourneyStore.getState().setScreen('disruption_alert');
        }
      }
    } catch (err) {
      console.error('Failed to fetch departures:', err);
    }
  }, []);

  const refreshService = useCallback(async () => {
    const j = useJourneyStore.getState();
    const serviceId = j.selectedDeparture?.serviceId || j.activeJourney?.serviceId;
    if (!serviceId) return;
    try {
      const data = await fetchServiceDetail(serviceId);
      if (j.screen === 'train_detail') {
        j.setServiceDetail(data.service);
      }
      if (j.activeJourney) {
        j.updateActiveServiceDetail(data.service);
      }
    } catch (err) {
      console.error('Failed to fetch service:', err);
    }
  }, []);

  const refreshTube = useCallback(async () => {
    const s = useSettingsStore.getState();
    try {
      const data = await fetchTubeArrivals(s.tubeStationNaptan, s.tubeLines);
      useJourneyStore.getState().setTubeLines(data.lines, data.generatedAt);
    } catch (err) {
      console.error('Failed to fetch tube:', err);
    }
  }, []);

  const setupPolling = useCallback(() => {
    clearIntervals();
    const j = useJourneyStore.getState();
    const isFg = j.isForeground;

    if (!isFg) {
      // Background: minimal polling
      intervalsRef.current.push(window.setInterval(refreshDepartures, POLL_BACKGROUND));
      return;
    }

    const phase = j.activeJourney?.phase;

    switch (j.screen) {
      case 'departure_board':
        intervalsRef.current.push(window.setInterval(refreshDepartures, POLL_DEPARTURES));
        break;
      case 'train_detail':
        intervalsRef.current.push(window.setInterval(refreshDepartures, POLL_DEPARTURES));
        intervalsRef.current.push(window.setInterval(refreshService, POLL_SERVICE));
        break;
      case 'journey_active':
        if (phase === 'at_station') {
          intervalsRef.current.push(window.setInterval(refreshDepartures, POLL_DEPARTURES_ACTIVE));
          intervalsRef.current.push(window.setInterval(() => {
            useJourneyStore.getState().updateJourneyPhase();
          }, 30000));
        } else if (phase === 'on_train') {
          intervalsRef.current.push(window.setInterval(refreshService, POLL_SERVICE));
          intervalsRef.current.push(window.setInterval(() => {
            useJourneyStore.getState().updateJourneyPhase();
          }, 60000));
        } else if (phase === 'approaching') {
          intervalsRef.current.push(window.setInterval(refreshTube, POLL_TUBE_APPROACHING));
          intervalsRef.current.push(window.setInterval(() => {
            useJourneyStore.getState().updateJourneyPhase();
          }, 20000));
        } else if (phase === 'transfer') {
          intervalsRef.current.push(window.setInterval(refreshTube, POLL_TUBE));
          intervalsRef.current.push(window.setInterval(() => {
            useJourneyStore.getState().updateJourneyPhase();
          }, 15000));
        }
        break;
      case 'tube_board':
        intervalsRef.current.push(window.setInterval(refreshTube, POLL_TUBE));
        break;
    }
  }, [clearIntervals, refreshDepartures, refreshService, refreshTube]);

  const updateGlassDisplay = useCallback(async (forceRebuild: boolean = false) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const snapshot = buildSnapshot();
    const { containers, updates } = toDisplayData(snapshot);

    if (forceRebuild || currentScreenRef.current !== snapshot.screen) {
      currentScreenRef.current = snapshot.screen;
      await bridge.rebuildPageContainer(new RebuildPageContainer({
        containerTotalNum: containers.length,
        textObject: containers,
      }));
    } else {
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

  const dispatchAction = useCallback((storeAction: any) => {
    const j = useJourneyStore.getState();
    const s = useSettingsStore.getState();
    const d = useDisruptionStore.getState();

    switch (storeAction.type) {
      case 'MOVE_HIGHLIGHT':
        j.moveHighlight(storeAction.direction);
        break;
      case 'SELECT_DEPARTURE':
        j.selectDeparture(storeAction.departure);
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
          storeAction.direction,
          Math.max(0, (j.serviceDetail?.callingPoints.length || 0) - 4),
        );
        break;
      case 'START_JOURNEY': {
        const dep = j.selectedDeparture;
        const detail = j.serviceDetail;
        if (dep && detail) {
          const depTime = hhmmToEpoch(
            detail.estimatedDeparture === 'On time'
              ? detail.scheduledDeparture
              : detail.estimatedDeparture,
          );
          const arrTime = hhmmToEpoch(
            detail.estimatedArrival === 'On time'
              ? detail.scheduledArrival
              : detail.estimatedArrival,
          );
          j.startJourney(dep, detail, depTime, arrTime);
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
        if (d.disruption) {
          d.acknowledge(d.disruption.serviceId, d.disruption.delayMinutes);
        }
        d.dismiss();
        j.setScreen(j.previousScreen || 'journey_active');
        break;
      case 'DISMISS_DISRUPTION_AND_SHOW_ALTERNATIVES':
        if (d.disruption) {
          d.acknowledge(d.disruption.serviceId, d.disruption.delayMinutes);
        }
        d.dismiss();
        j.setScreen('departure_board');
        break;
    }

    // Update display after action
    setTimeout(() => updateGlassDisplay(), 50);
  }, [refreshDepartures, refreshService, refreshTube, updateGlassDisplay]);

  const navigateScreen = useCallback((screen: ScreenId) => {
    useJourneyStore.getState().setScreen(screen);
    setupPolling();
    setTimeout(() => updateGlassDisplay(true), 50);
  }, [setupPolling, updateGlassDisplay]);

  const handleEvent = useCallback((event: any) => {
    const j = useJourneyStore.getState();
    const snapshot = buildSnapshot();

    // System events
    if (event.sysEvent) {
      const sysType = event.sysEvent.eventType;
      if (sysType === OsEventTypeList.FOREGROUND_ENTER_EVENT || sysType === 4) {
        j.setForeground(true);
        setupPolling();
        refreshDepartures();
        updateGlassDisplay(true);
        return;
      }
      if (sysType === OsEventTypeList.FOREGROUND_EXIT_EVENT || sysType === 5) {
        j.setForeground(false);
        setupPolling();
        return;
      }
      if (sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT || sysType === 6) {
        // State is persisted via zustand persist middleware
        return;
      }
    }

    // Text input events
    if (event.textEvent) {
      const eventType = event.textEvent.eventType;
      let action: AppAction;

      if (eventType === OsEventTypeList.SCROLL_TOP_EVENT || eventType === 1) {
        action = { type: 'SCROLL_UP' };
      } else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT || eventType === 2) {
        action = { type: 'SCROLL_DOWN' };
      } else if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT || eventType === 3) {
        action = { type: 'BACK' };
      } else {
        // CLICK_EVENT: 0 or undefined
        action = { type: 'SELECT' };
      }

      handleGlassAction(action, snapshot, dispatchAction, navigateScreen, j.previousScreen);
    }
  }, [dispatchAction, navigateScreen, setupPolling, refreshDepartures, updateGlassDisplay]);

  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;

    (async () => {
      try {
        await waitForEvenAppBridge();
        const bridge = EvenAppBridge.getInstance();
        bridgeRef.current = bridge;

        // Register event handler
        bridge.onEvenHubEvent(handleEvent);

        // Initial page
        const snapshot = buildSnapshot();
        const { containers } = toDisplayData(snapshot);
        const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
          containerTotalNum: containers.length,
          textObject: containers,
        }));
        if (result !== 0) {
          console.error('createStartUpPageContainer failed:', result);
        }

        // Start fetching data
        await refreshDepartures();
        setupPolling();

        // Subscribe to store changes for display updates
        useJourneyStore.subscribe(() => {
          updateGlassDisplay();
        });
      } catch (err) {
        console.error('Failed to init glasses:', err);
      }
    })();

    return () => {
      clearIntervals();
    };
  }, [handleEvent, refreshDepartures, setupPolling, updateGlassDisplay, clearIntervals]);

  // This component renders nothing on the phone — it only manages the glass bridge
  return null;
}
