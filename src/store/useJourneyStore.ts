import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Departure,
  ServiceDetail,
  TubeLineArrivals,
  JourneyPhase,
  ScreenId,
  ActiveJourney,
} from '../types';
import { APPROACHING_MINUTES, TRANSFER_TIMEOUT_MINUTES } from '../utils/constants';

interface JourneyState {
  screen: ScreenId;
  previousScreen: ScreenId | null;
  departures: Departure[];
  highlightedIndex: number;
  lastRefresh: string | null;
  isLoading: boolean;
  error: string | null;
  selectedDeparture: Departure | null;
  serviceDetail: ServiceDetail | null;
  detailScrollPos: number;
  activeJourney: ActiveJourney | null;
  tubeLines: TubeLineArrivals[];
  tubeLastRefresh: string | null;
  isForeground: boolean;

  setScreen: (screen: ScreenId) => void;
  setDepartures: (deps: Departure[], generatedAt: string) => void;
  setHighlightedIndex: (i: number) => void;
  moveHighlight: (direction: 'up' | 'down') => void;
  selectDeparture: (dep: Departure) => void;
  setServiceDetail: (detail: ServiceDetail) => void;
  setDetailScrollPos: (pos: number) => void;
  scrollDetail: (direction: 'up' | 'down', maxScroll: number) => void;
  startJourney: (dep: Departure, detail: ServiceDetail, departureTime: number, arrivalTime: number) => void;
  updateJourneyPhase: () => void;
  setCancelConfirm: (pending: boolean) => void;
  cancelJourney: () => void;
  setTubeLines: (lines: TubeLineArrivals[], generatedAt: string) => void;
  setForeground: (fg: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateActiveServiceDetail: (detail: ServiceDetail) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      screen: 'splash',
      previousScreen: null,
      departures: [],
      highlightedIndex: 0,
      lastRefresh: null,
      isLoading: true,
      error: null,
      selectedDeparture: null,
      serviceDetail: null,
      detailScrollPos: 0,
      activeJourney: null,
      tubeLines: [],
      tubeLastRefresh: null,
      isForeground: true,

      setScreen: (screen) => set((s) => ({ screen, previousScreen: s.screen })),

      setDepartures: (departures, generatedAt) => {
        const state = get();
        set({
          departures,
          lastRefresh: generatedAt,
          isLoading: false,
          error: null,
          screen: state.screen === 'splash' ? 'departure_board' : state.screen,
        });
      },

      setHighlightedIndex: (highlightedIndex) => set({ highlightedIndex }),

      moveHighlight: (direction) =>
        set((state) => {
          const max = Math.max(0, state.departures.length - 1);
          const newIdx = direction === 'up'
            ? Math.max(0, state.highlightedIndex - 1)
            : Math.min(max, state.highlightedIndex + 1);
          return { highlightedIndex: newIdx };
        }),

      selectDeparture: (dep) =>
        set({
          selectedDeparture: dep,
          serviceDetail: null,
          detailScrollPos: 0,
          screen: 'train_detail',
        }),

      setServiceDetail: (detail) => set({ serviceDetail: detail }),
      setDetailScrollPos: (detailScrollPos) => set({ detailScrollPos }),

      scrollDetail: (direction, maxScroll) =>
        set((state) => ({
          detailScrollPos: direction === 'up'
            ? Math.max(0, state.detailScrollPos - 1)
            : Math.min(maxScroll, state.detailScrollPos + 1),
        })),

      startJourney: (dep, detail, departureTime, arrivalTime) =>
        set({
          activeJourney: {
            tripId: dep.tripId,
            departure: dep,
            serviceDetail: detail,
            departureTime,
            arrivalTime,
            phase: 'at_station',
            cancelConfirmPending: false,
          },
          screen: 'journey_active',
        }),

      updateJourneyPhase: () =>
        set((state) => {
          const j = state.activeJourney;
          if (!j) return {};
          const now = Date.now();
          let phase: JourneyPhase;

          if (now < j.departureTime) {
            phase = 'at_station';
          } else if (now < j.arrivalTime - APPROACHING_MINUTES * 60000) {
            phase = 'on_train';
          } else if (now < j.arrivalTime) {
            phase = 'approaching';
          } else if (now < j.arrivalTime + TRANSFER_TIMEOUT_MINUTES * 60000) {
            phase = 'transfer';
          } else {
            return { activeJourney: null, screen: 'departure_board' };
          }
          return { activeJourney: { ...j, phase } };
        }),

      setCancelConfirm: (pending) =>
        set((state) => ({
          activeJourney: state.activeJourney
            ? { ...state.activeJourney, cancelConfirmPending: pending }
            : null,
        })),

      cancelJourney: () => set({ activeJourney: null, screen: 'departure_board' }),

      setTubeLines: (lines, generatedAt) =>
        set({ tubeLines: lines, tubeLastRefresh: generatedAt }),

      setForeground: (isForeground) => set({ isForeground }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      updateActiveServiceDetail: (detail) =>
        set((state) => ({
          activeJourney: state.activeJourney
            ? { ...state.activeJourney, serviceDetail: detail }
            : null,
        })),
    }),
    {
      name: 'commute-journey',
      partialize: (state) => ({
        activeJourney: state.activeJourney,
        screen: state.activeJourney ? state.screen : 'splash',
      }),
    },
  ),
);
