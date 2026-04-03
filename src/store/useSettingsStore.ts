import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
  toggleTubeLine: (lineId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      updateSettings: (partial) => set(partial),
      resetSettings: () => set(DEFAULT_SETTINGS),
      toggleTubeLine: (lineId) =>
        set((state) => ({
          tubeLines: state.tubeLines.includes(lineId)
            ? state.tubeLines.filter((l) => l !== lineId)
            : [...state.tubeLines, lineId],
        })),
    }),
    { name: 'commute-settings' },
  ),
);
