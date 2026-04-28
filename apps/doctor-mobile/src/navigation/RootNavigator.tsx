import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, StatusBar, Image } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import * as SplashScreen from 'expo-splash-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardTabs from './DashboardTabs';
import WebViewScreen from '../screens/WebViewScreen';
import OfflineGateScreen from '../screens/OfflineGateScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useAppStore } from '../store/appStore';
import { useThemeStore } from '../store/themeStore';

// ---------------------------------------------------------------------------
// RootNavigator — The Core Routing Engine
// ---------------------------------------------------------------------------
// This replaces the web's `AppFlow` + `AuthenticatedRoutes` components from 
// App.jsx. It makes routing decisions based on:
//
//   1. Authentication State (session from Supabase)
//   2. Profile Status (from get_doctor_full_profile RPC)
//   3. Network Connectivity (from NetInfo)
//
// Routing Matrix:
//   ┌────────────────┬──────────┬──────────────────┐
//   │ Session?       │ Status   │ Screen           │
//   ├────────────────┼──────────┼──────────────────┤
//   │ No             │ -        │ LoginScreen      │
//   │ Yes            │ approved │ DashboardTabs    │
//   │ Yes            │ other    │ WebViewScreen    │
//   │ Yes            │ other    │ OfflineGateScreen│
//   │                │ + offline│                  │
//   └────────────────┴──────────┴──────────────────┘
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

export default function RootNavigator() {
  // =========================================================================
  // 1. ALL HOOKS MUST GO AT THE TOP (NO EXCEPTIONS)
  // =========================================================================
  const session = useAuthStore((s) => s.session);
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const error = useAuthStore((s) => s.error);
  const setSession = useAuthStore((s) => s.setSession);
  const fetchProfileStatus = useAuthStore((s) => s.fetchProfileStatus);

  const { isOnline } = useNetworkStatus();
  const hasSeenNativeOnboarding = useAppStore((s) => s.hasSeenNativeOnboarding);
  const checkOnboardingStatus = useAppStore((s) => s.checkOnboardingStatus);
  const resolved = useThemeStore((s) => s.resolved);
  const loadTheme = useThemeStore((s) => s.loadTheme);

  // --- Push Notification Hooks (Moved to the top!) ---
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // --- Effects ---
  useEffect(() => {
    checkOnboardingStatus();
    loadTheme();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`🔐 [Auth] State changed: ${_event}`);
      setSession(session);

      if (session) {
        fetchProfileStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Only hide splash screen when we are 100% ready to show a screen
    // This prevents the "white flash" or "white screen" issue.
    const isReady = !isLoading && (!session || (profileStatus !== null && !isProfileLoading));

    if (isReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isLoading, isProfileLoading, session, profileStatus]);

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.content.data?.route &&
      lastNotificationResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      if (navigationRef.isReady()) {
        console.log('[Push] Deep linking to:', data.route, data.params);
        navigationRef.navigate(data.route as any, data.params as any);
      }
    }
  }, [lastNotificationResponse]);

  // =========================================================================
  // 2. EARLY RETURNS (Loading State)
  // =========================================================================
  // While we are waiting for Auth or Profile, we keep the Splash Screen active.
  // We return a branded loading view as a fallback in case the splash screen 
  // auto-hides or fails.
  if (isLoading || (session && (isProfileLoading || !profileStatus) && !error)) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Image
          source={require('../../assets/breathy_logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#14b8a6" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Initializing Breathy...</Text>
      </View>
    );
  }

  // =========================================================================
  // 3. RENDER LOGIC AND UI
  // =========================================================================
  const isApproved = profileStatus?.profile_status === 'approved';
  const needsOnlineFlow = session && !isApproved;

  const navTheme = resolved === 'dark' ? {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, primary: '#14b8a6', background: '#0f172a', card: '#1e293b', border: '#334155' },
  } : {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: '#14b8a6', background: '#f8fafc', card: '#ffffff', border: '#f1f5f9' },
  };

  return (
    <>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={resolved === 'dark' ? '#0f172a' : '#f8fafc'} />
      <BottomSheetModalProvider>
        <NavigationContainer theme={navTheme} ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!session ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : isApproved ? (
              <Stack.Screen name="Dashboard" component={DashboardTabs} />
            ) : isOnline ? (
              <Stack.Screen name="WebView" component={WebViewScreen} />
            ) : (
              <Stack.Screen name="OfflineGate" component={OfflineGateScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </BottomSheetModalProvider>
    </>
  );
}


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
});
