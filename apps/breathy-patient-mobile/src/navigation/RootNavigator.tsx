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
import { useOTAUpdates } from '../hooks/useOTAUpdates';
import UpdateModal from '../components/ui/UpdateModal';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { session, setSession, isLoading } = useAuthStore();
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
      }
    });

    return () => {

      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {

    // Hide splash screen once auth is initialized AND store is not loading
    if (isAuthInitialized && !isLoading) {

      SplashScreen.hideAsync().catch((e) => {
        console.warn('Failed to hide splash screen', { error: e.message });
      });
    }
  }, [isAuthInitialized, isLoading]);

  if (!isAuthInitialized || isLoading) {

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
        {!session ? (
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
            <Stack.Screen name="AiAnalyzer" component={AiAnalyzerScreen} />
            <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} />
            <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
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
