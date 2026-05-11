import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { PostHogProvider } from 'posthog-react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { posthog } from './src/config/posthog';
import { useThemeStore } from './src/store/themeStore';

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync();

// Suppress known non-critical warnings
LogBox.ignoreLogs([
  'AxiosError: Network Error',
  'Request failed with status code 401',
]);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PostHogProvider
          client={posthog}
          autocapture={{
            captureScreens: false,
            captureTouches: true,
            propsToCapture: ['testID'],
          }}
        >
          <RootNavigator />
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
