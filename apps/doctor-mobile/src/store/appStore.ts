import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

interface AppState {
  hasSeenNativeOnboarding: boolean;
  setHasSeenNativeOnboarding: (value: boolean) => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  hasSeenNativeOnboarding: false,

  setHasSeenNativeOnboarding: async (value: boolean) => {
    try {
      await AsyncStorage.setItem('hasSeenNativeOnboarding', JSON.stringify(value));
      set({ hasSeenNativeOnboarding: value });
    } catch (e) {
      Logger.error('Onboarding status save failed', e, { source: 'appStore' });
    }
  },

  checkOnboardingStatus: async () => {
    try {
      const value = await AsyncStorage.getItem('hasSeenNativeOnboarding');
      if (value !== null) {
        set({ hasSeenNativeOnboarding: JSON.parse(value) });
      }
    } catch (e) {
      Logger.error('Onboarding status fetch failed', e, { source: 'appStore' });
    }
  },
}));
