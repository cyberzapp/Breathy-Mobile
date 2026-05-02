import React, { useEffect } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext } from 'react';
import { PostHogProvider } from 'posthog-react-native';
import { database } from './src/database';
import RootNavigator from './src/navigation/RootNavigator';
import { posthog } from './src/config/posthog';
import { Logger } from './src/utils/logger';

// ---------------------------------------------------------------------------
// App.tsx — Application Root
// ---------------------------------------------------------------------------
// This is the rewritten entry point for the Breathy Doctor native app.
// It replaces the previous WebView-only architecture with a hybrid approach:
//
//   1. Splash Screen → Lottie animation (unchanged)
//   2. WatermelonDB boot check (unchanged)
//   3. RootNavigator → Handles all auth/routing decisions
//
// The RootNavigator decides what screen to show based on:
//   - Auth session state
//   - Profile status (approved vs onboarding)
//   - Network connectivity
// ---------------------------------------------------------------------------

SplashScreen.preventAutoHideAsync();

// Suppress known non-critical warnings
LogBox.ignoreLogs([
  '[Sync Engine] Sync failed',
  'AxiosError: Network Error',
  'Request failed with status code 401',
]);

// Database context — shared with any component that needs offline-first data
export const DatabaseContext = createContext(database);
export const useDatabase = () => useContext(DatabaseContext);

export default function App() {
  // Boot Sequence: Verify WatermelonDB is alive
  // -------------------------------------------------------------------------
  useEffect(() => {
    const bootSequence = async () => {
      try {
        const count = await database.get('patients').query().fetchCount();
        
      } catch (e) {
        Logger.error('App Boot Sequence failed', e, { source: 'App.tsx' });
      }
    };
    bootSequence();
  }, []);

  // -------------------------------------------------------------------------
  // Render Main App
  // (Splash Screen hiding is now handled by RootNavigator once auth resolves)
  // -------------------------------------------------------------------------
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PostHogProvider
          client={posthog}
          autocapture={{
            captureScreens: true,
            captureTouches: true,
            propsToCapture: ['testID'],
          }}
        >
          <DatabaseContext.Provider value={database}>
            <RootNavigator />
          </DatabaseContext.Provider>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({});