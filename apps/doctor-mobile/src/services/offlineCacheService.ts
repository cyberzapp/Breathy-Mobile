import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Offline Cache Service — AsyncStorage-backed cache for Vault & Profile data
// ---------------------------------------------------------------------------
// Strategy: Cache-first for reads, then refresh from API when online.
// Each cache entry is stored as JSON with a timestamp for freshness.
// ---------------------------------------------------------------------------

const CACHE_KEYS = {
  VAULT_PATIENTS: 'cache_vault_patients',
  VAULT_PRESCRIPTIONS: 'cache_vault_prescriptions',
  PROFILE_DATA: 'cache_profile_data',
  PRESCRIPTION_DETAILS: 'cache_prescription_details',
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Generic cache helpers
// ---------------------------------------------------------------------------

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.warn('[OfflineCache] Failed to write cache:', key, err);
  }
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch (err) {
    console.warn('[OfflineCache] Failed to read cache:', key, err);
    return null;
  }
}

async function getCacheWithTimestamp<T>(
  key: string
): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Network status helper
// ---------------------------------------------------------------------------

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vault Data (Patients / Prescriptions)
// ---------------------------------------------------------------------------

export async function cacheVaultPatients(data: any[]): Promise<void> {
  await setCache(CACHE_KEYS.VAULT_PATIENTS, data);
}

export async function getCachedVaultPatients(): Promise<any[] | null> {
  return getCache<any[]>(CACHE_KEYS.VAULT_PATIENTS);
}

export async function cacheVaultPrescriptions(data: any[]): Promise<void> {
  await setCache(CACHE_KEYS.VAULT_PRESCRIPTIONS, data);
}

export async function getCachedVaultPrescriptions(): Promise<any[] | null> {
  return getCache<any[]>(CACHE_KEYS.VAULT_PRESCRIPTIONS);
}

// ---------------------------------------------------------------------------
// Prescription Details — keyed by prescription ID
// ---------------------------------------------------------------------------

export async function cachePrescriptionDetail(
  prescriptionId: string,
  data: any
): Promise<void> {
  const key = `${CACHE_KEYS.PRESCRIPTION_DETAILS}_${prescriptionId}`;
  await setCache(key, data);
}

export async function getCachedPrescriptionDetail(
  prescriptionId: string
): Promise<any | null> {
  const key = `${CACHE_KEYS.PRESCRIPTION_DETAILS}_${prescriptionId}`;
  return getCache<any>(key);
}

// ---------------------------------------------------------------------------
// Doctor Profile
// ---------------------------------------------------------------------------

export async function cacheProfile(data: any): Promise<void> {
  await setCache(CACHE_KEYS.PROFILE_DATA, data);
}

export async function getCachedProfile(): Promise<any | null> {
  return getCache<any>(CACHE_KEYS.PROFILE_DATA);
}

export async function getCachedProfileWithTimestamp(): Promise<CacheEntry<any> | null> {
  return getCacheWithTimestamp<any>(CACHE_KEYS.PROFILE_DATA);
}

// ---------------------------------------------------------------------------
// Clear all caches (useful for sign-out)
// ---------------------------------------------------------------------------

export async function clearAllCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to clear caches:', err);
  }
}
