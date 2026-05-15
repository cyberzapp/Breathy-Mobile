import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAppLanguage } from '../config/i18n';
import i18n from '../config/i18n';

const HAS_COMPLETED_ONBOARDING_KEY = 'hasCompletedOnboarding';
const LANGUAGE_KEY = 'app-language';

interface AppState {
  hasCompletedOnboarding: boolean;
  language: string;
  isAppStoreReady: boolean;
  initializeAppStore: () => Promise<void>;
  setHasCompletedOnboarding: (status: boolean) => void;
  setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  language: 'en',
  isAppStoreReady: false,

  initializeAppStore: async () => {
    try {
      const status = await AsyncStorage.getItem(HAS_COMPLETED_ONBOARDING_KEY);
      const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
      set({ 
        hasCompletedOnboarding: status === 'true',
        language: lang || i18n.language || 'en',
        isAppStoreReady: true 
      });
    } catch (e) {
      set({ isAppStoreReady: true });
    }
  },
  
  setHasCompletedOnboarding: (status: boolean) => {
    AsyncStorage.setItem(HAS_COMPLETED_ONBOARDING_KEY, status ? 'true' : 'false').catch(() => {});
    set({ hasCompletedOnboarding: status });
  },
  
  setLanguage: (lang: string) => {
    setAppLanguage(lang);
    set({ language: lang });
  },
}));
