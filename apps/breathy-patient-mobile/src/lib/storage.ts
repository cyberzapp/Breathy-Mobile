import { MMKV } from 'react-native-mmkv';
// In some environments (like Expo Go), MMKV's native modules might be missing.
// We use a safe initialization to prevent app hangs.
let mmkvInstance: any;
try {
  mmkvInstance = new MMKV();
} catch (e) {
  console.warn('MMKV failed to initialize. Falling back to memory storage. This usually happens in Expo Go. Use a development build for native MMKV support.');
  // Simple memory-based fallback for development/Expo Go
  const memoryStorage = new Map<string, string>();
  mmkvInstance = {
    set: (key: string, value: string | boolean | number) => memoryStorage.set(key, String(value)),
    getString: (key: string) => memoryStorage.get(key),
    delete: (key: string) => memoryStorage.delete(key),
    getAllKeys: () => Array.from(memoryStorage.keys()),
  };
}

export const storage = mmkvInstance;

/**
 * Custom storage adapter for Zustand persist middleware
 */
export const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};
