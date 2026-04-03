import { create } from 'zustand';
import type { DisruptionInfo } from '../types';

interface DisruptionState {
  disruption: DisruptionInfo | null;
  acknowledgedIds: Set<string>;
  setDisruption: (d: DisruptionInfo | null) => void;
  acknowledge: (serviceId: string, delayMinutes: number) => void;
  dismiss: () => void;
  shouldAlert: (serviceId: string, delayMinutes: number, isCancelled: boolean, threshold: number) => boolean;
}

export const useDisruptionStore = create<DisruptionState>()((set, get) => ({
  disruption: null,
  acknowledgedIds: new Set<string>(),

  setDisruption: (d) => set({ disruption: d }),

  acknowledge: (serviceId, delayMinutes) =>
    set((state) => {
      const newAcknowledged = new Set(state.acknowledgedIds);
      newAcknowledged.add(`${serviceId}:${delayMinutes}`);
      return {
        acknowledgedIds: newAcknowledged,
        disruption: state.disruption
          ? { ...state.disruption, acknowledgedDelayMinutes: delayMinutes }
          : null,
      };
    }),

  dismiss: () => set({ disruption: null }),

  shouldAlert: (serviceId, delayMinutes, isCancelled, threshold) => {
    const state = get();
    if (isCancelled) {
      return !state.acknowledgedIds.has(`${serviceId}:cancelled`);
    }
    // Check if delay increased by threshold above any previously acknowledged level
    const currentDisruption = state.disruption;
    const ackDelay = currentDisruption?.serviceId === serviceId
      ? currentDisruption.acknowledgedDelayMinutes
      : 0;
    return delayMinutes >= ackDelay + threshold;
  },
}));
