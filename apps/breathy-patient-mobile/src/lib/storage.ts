import { createMMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

const MMKV_KEY = 'mmkv.encryption.key';

// Attempt to fetch the secure master key
let secureKey = SecureStore.getItem(MMKV_KEY);

if (!secureKey) {
  // Generate a random 16-character string if one doesn't exist
  secureKey = Math.random().toString(36).substring(2, 18);
  SecureStore.setItem(MMKV_KEY, secureKey);
}

// Initialize the Encrypted MMKV Instance
export const storage = createMMKV({
  id: 'secure-breathy-storage',
  encryptionKey: secureKey,
});

// A wrapper to use MMKV as a Supabase storage adapter
export const supabaseStorageAdapter = {
  getItem: (key: string) => {
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

// A wrapper to use MMKV with Zustand persist middleware
export const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.remove(name);
  },
};

