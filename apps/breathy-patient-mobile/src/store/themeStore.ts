import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import { zustandStorage } from '../lib/storage';

// ---------------------------------------------------------------------------
// Theme Store — Manages app-wide appearance (light / dark / system)
// ---------------------------------------------------------------------------
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  /** The resolved color scheme currently in effect */
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const resolveScheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      resolved: resolveScheme('system'),

      setMode: (mode: ThemeMode) => {
        set({ mode, resolved: resolveScheme(mode) });
      },
    }),
    {
      name: 'theme_mode',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist the mode, resolved can be recomputed
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolved = resolveScheme(state.mode);
        }
      },
    }
  )
);

// Listen for system appearance changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { mode } = useThemeStore.getState();
  if (mode === 'system') {
    useThemeStore.setState({ resolved: colorScheme === 'dark' ? 'dark' : 'light' });
  }
});
