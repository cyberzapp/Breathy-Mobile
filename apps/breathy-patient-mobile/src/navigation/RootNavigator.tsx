import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import DashboardTabs from './DashboardTabs';
import ConnectScreen from '../screens/dashboard/ConnectScreen';
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '../hooks/useColors';
import DoctorProfileScreen from '../screens/search/DoctorProfileScreen';
import BookingFlowScreen from '../screens/search/BookingFlowScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import VideoRoomScreen from '../screens/chat/VideoRoomScreen';
import HealthRecordsScreen from '../screens/dashboard/HealthRecordsScreen';
import PrescriptionsScreen from '../screens/dashboard/PrescriptionsScreen';
import AiAnalyzerScreen from '../screens/dashboard/AiAnalyzerScreen';
import ClinicProfileScreen from '../screens/search/ClinicProfileScreen';
import BookingSuccessScreen from '../screens/search/BookingSuccessScreen';
import SectionWebViewScreen from '../screens/dashboard/SectionWebViewScreen';
import TreatmentPlansScreen from '../screens/dashboard/TreatmentPlansScreen';
import PdfViewerScreen from '../screens/dashboard/PdfViewerScreen';
import CheckInScreen from '../screens/search/CheckInScreen';
import FoodScannerScreen from '../screens/dashboard/FoodScannerScreen';
import FoodDatabaseScreen from '../screens/dashboard/FoodDatabaseScreen';
import ProgressScreen from '../screens/dashboard/ProgressScreen';
import TaraScreen from '../screens/dashboard/TaraScreen';
import { useOTAUpdates } from '../hooks/useOTAUpdates';
import UpdateModal from '../components/ui/UpdateModal';

import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import WelcomeCarouselScreen from '../screens/auth/WelcomeCarouselScreen';
import { useAppStore } from '../store/appStore';
import { registerForPushNotificationsAsync } from '../hooks/usePushNotifications';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const isAppStoreReady = useAppStore((state) => state.isAppStoreReady);
  const initializeAppStore = useAppStore((state) => state.initializeAppStore);
  const c = useColors();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // ── OTA Updates (no-op in __DEV__) ──
  const {
    updateModalVisible,
    updatePhase,
    updateProgress,
    isForceUpdate,
    onUpdate,
    onDismiss,
    onRetry,
  } = useOTAUpdates();

  useEffect(() => {
    initializeAppStore();
  }, [initializeAppStore]);

  useEffect(() => {
    let isMounted = true;


    // 1. Initial session check with a safety timeout
    const initAuth = async () => {

      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 1500))
        ]) as any;
        

        if (isMounted) {
          setSession(session);
          setIsAuthInitialized(true);
        } else {
        }
      } catch (err) {
        console.error('[RootNavigator] Initial auth check failed or timed out', err, { source: 'RootNavigator' });
        if (isMounted) {
          setSession(null); // Fallback to login
          setIsAuthInitialized(true);

        }
      }
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {

      if (isMounted) {
        setSession(session);
        if (session) {
          registerForPushNotificationsAsync();
        }
      }
    });

    return () => {

      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {
    // FORCE HIDE splash screen after 1s to see what is underneath
    setTimeout(() => {
      SplashScreen.hideAsync().catch(console.warn);
    }, 1000);
  }, []);

  if (!isAuthInitialized || isLoading || !isAppStoreReady) {

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }



  return (
    <>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <Stack.Group>
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          </Stack.Group>
        ) : !session ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          </>
        ) : (
          // Main App Stack
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={DashboardTabs} />
            <Stack.Screen name="Connect" component={ConnectScreen} />
            <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
            <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="VideoRoom" component={VideoRoomScreen} />
            <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} />
            <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
            <Stack.Screen name="TreatmentPlans" component={TreatmentPlansScreen} />
            <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
            <Stack.Screen name="AiAnalyzer" component={AiAnalyzerScreen} />
            <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} />
            <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
            <Stack.Screen name="SectionWebView" component={SectionWebViewScreen} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
            <Stack.Screen name="FoodScanner" component={FoodScannerScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="FoodDatabase" component={FoodDatabaseScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
            <Stack.Screen name="TaraScreen" component={TaraScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>

    {/* ── OTA Update Modal (root-level overlay) ── */}
    <UpdateModal
      visible={updateModalVisible}
      phase={updatePhase}
      progress={updateProgress}
      forceUpdate={isForceUpdate}
      onUpdate={onUpdate}
      onDismiss={onDismiss}
      onRetry={onRetry}
    />
    </>
  );
}
