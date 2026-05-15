import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';

const LANGUAGE_KEY = 'app-language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
};

// Initial synchronous fallback
const getFallbackLanguage = () => {
  try {
    const locales = Localization.getLocales();
    const deviceLang = locales && locales.length > 0 ? locales[0].languageCode : 'en';
    return deviceLang && resources[deviceLang as keyof typeof resources] ? deviceLang : 'en';
  } catch (error) {
    console.warn('[i18n] Error detecting language, falling back to en:', error);
    return 'en';
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: getFallbackLanguage(), // Default fallback synchronously
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

// Async load saved language
AsyncStorage.getItem(LANGUAGE_KEY).then((savedLanguage) => {
  if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
    i18n.changeLanguage(savedLanguage);
  }
}).catch(() => {});

// Expose a helper to change language and persist it
export const setAppLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(() => {});
};

export default i18n;
