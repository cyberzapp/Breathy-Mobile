import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// useNetworkStatus Hook
// ---------------------------------------------------------------------------
// Provides a real-time boolean `isOnline` that instantly reflects the device's
// internet connectivity. Used by the Offline Gate to block non-approved
// doctors from proceeding when there is no internet connection.
// ---------------------------------------------------------------------------

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true); // Optimistic default

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // isInternetReachable is the most reliable check — it performs an
      // actual connectivity probe, not just "is Wi-Fi on"
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline };
}
