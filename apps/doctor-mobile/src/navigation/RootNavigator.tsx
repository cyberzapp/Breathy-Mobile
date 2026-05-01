import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, StatusBar, Image } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { postMessage } from '../services/chatService';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import * as SplashScreen from 'expo-splash-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardTabs from './DashboardTabs';
import NativeOnboardingScreen from '../screens/NativeOnboardingScreen';
import WelcomeOnboardingScreen from '../screens/WelcomeOnboardingScreen';
import AwaitingReviewScreen from '../screens/AwaitingReviewScreen';
import OfflineGateScreen from '../screens/OfflineGateScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useAppStore } from '../store/appStore';
import { useThemeStore } from '../store/themeStore';
import { registerForPushNotificationsAsync } from '../hooks/usePushNotifications';
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

  useEffect(() => {
    // Registers a special notification type that has a text input box natively
    Notifications.setNotificationCategoryAsync('chat_message', [
      {
        identifier: 'REPLY_ACTION',
        buttonTitle: 'Reply',
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Type a message...',
        },
        options: {
          opensAppToForeground: false, // Send silently in background if possible
        },
      },
    ]);
  }, []);
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
        registerForPushNotificationsAsync();
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
    if (!lastNotificationResponse) return;

    // Cast data as an any-type record so TypeScript stops complaining about missing properties
    const data = lastNotificationResponse.notification.request.content.data as Record<string, any>;
    const actionId = lastNotificationResponse.actionIdentifier;

    // SCENARIO 1: The user typed a quick reply from their lock screen
    if (actionId === 'REPLY_ACTION') {
      const userText = (lastNotificationResponse as any).userText;
      const params = data?.params; // Safely extract params
      
      if (userText && params?.sessionId) {
        console.log('[Push] Silently sending quick reply to session:', params.sessionId);
        postMessage(params.sessionId, userText).catch(console.error);
      }
      return; 
    }

    // SCENARIO 2: The user tapped the notification normally (Deep Link)
    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER && data?.route) {
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
  const isOnboarding = profileStatus?.profile_status === 'onboarding';
  const isInProgress = profileStatus?.profile_status === 'in_progress';
  const isAwaitingReview = profileStatus?.profile_status === 'awaiting_review';
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
            ) : !isOnline ? (
              <Stack.Screen name="OfflineGate" component={OfflineGateScreen} />
            ) : isOnboarding ? (
              // Phase 1: Just prefix + name → creates row in doctors table
              // Mirrors web's: case 'onboarding': return <Onboarding />
              <Stack.Screen name="WelcomeOnboarding" component={WelcomeOnboardingScreen} />
            ) : isInProgress ? (
              // Phase 2: Fill remaining details → update via RPC
              // Mirrors web's: case 'in_progress': return <ProfileLayout />
              <Stack.Screen name="NativeOnboarding" component={NativeOnboardingScreen} />
            ) : isAwaitingReview ? (
              // Phase 3: Profile submitted, pending admin approval
              // Mirrors web's: case 'awaiting_review': return <PendingApprovalPage />
              <Stack.Screen name="AwaitingReview" component={AwaitingReviewScreen} />
            ) : (
              // rejected, suspended, etc — show the detail form to re-submit
              <Stack.Screen name="NativeOnboarding" component={NativeOnboardingScreen} />
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
