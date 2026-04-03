import { create } from 'zustand';
import type { DisruptionInfo } from '../types';

interface DisruptionState {
  disruption: DisruptionInfo | null;
  acknowledgedIds: Set<string>;
  setDisruption: (d: DisruptionInfo | null) => void;
  acknowledge: (tripId: string, delayMinutes: number) => void;
  dismiss: () => void;
  shouldAlert: (tripId: string, delayMinutes: number, isCancelled: boolean, threshold: number) => boolean;
}

export const useDisruptionStore = create<DisruptionState>()((set, get) => ({
  disruption: null,
  acknowledgedIds: new Set<string>(),

  setDisruption: (d) => set({ disruption: d }),

  acknowledge: (tripId, delayMinutes) =>
    set((state) => {
      const newAcknowledged = new Set(state.acknowledgedIds);
      newAcknowledged.add(`${tripId}:${delayMinutes}`);
      return {
        acknowledgedIds: newAcknowledged,
        disruption: state.disruption
          ? { ...state.disruption, acknowledgedDelayMinutes: delayMinutes }
          : null,
      };
    }),

  dismiss: () => set({ disruption: null }),

  shouldAlert: (tripId, delayMinutes, isCancelled, threshold) => {
    const state = get();
    if (isCancelled) {
      return !state.acknowledgedIds.has(`${tripId}:cancelled`);
    }
    const currentDisruption = state.disruption;
    const ackDelay = currentDisruption?.tripId === tripId
      ? currentDisruption.acknowledgedDelayMinutes
      : 0;
    return delayMinutes >= ackDelay + threshold;
  },
}));
