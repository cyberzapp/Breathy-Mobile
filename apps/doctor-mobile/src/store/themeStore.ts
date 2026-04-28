import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

// ---------------------------------------------------------------------------
// Theme Store — Manages app-wide appearance (light / dark / system)
// ---------------------------------------------------------------------------
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  /** The resolved color scheme currently in effect */
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const resolveScheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return mode;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: resolveScheme('system'),

  setMode: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      set({ mode, resolved: resolveScheme(mode) });
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      const mode = (saved as ThemeMode) || 'system';
      set({ mode, resolved: resolveScheme(mode) });
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  },
}));

// Listen for system appearance changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { mode } = useThemeStore.getState();
  if (mode === 'system') {
    useThemeStore.setState({ resolved: colorScheme === 'dark' ? 'dark' : 'light' });
  }
});
