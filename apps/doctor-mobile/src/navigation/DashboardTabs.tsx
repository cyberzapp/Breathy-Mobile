import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Header & Overlays
import SharedHeader from '../components/SharedHeader';
import NotificationsPanel from '../components/NotificationsPanel';

// Tab Screens
import HomeScreen from '../screens/HomeScreen';
import VaultScreen from '../screens/VaultScreen';
import AppsHubScreen from '../screens/AppsHubScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import SectionWebViewScreen from '../screens/SectionWebViewScreen';
import CalendarScreen from '../screens/CalendarScreen';
import VideoModuleScreen from '../screens/VideoModuleScreen';
// Phase 4.1: Native Settings Screens
import AdditionalDetailsSettingsScreen from '../screens/settings/AdditionalDetailsSettingsScreen';
import AvailabilitySettingsScreen from '../screens/settings/AvailabilitySettingsScreen';
import PrescriptionSettingsScreen from '../screens/settings/PrescriptionSettingsScreen';
import ReceptionistsSettingsScreen from '../screens/settings/ReceptionistsSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import HelpScreen from '../screens/settings/HelpScreen';
import TermsScreen from '../screens/settings/TermsScreen';

// Phase 2: Chat Screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

// Phase 2: Apps native screens
import BreathyDeskScreen from '../screens/apps/BreathyDeskScreen';

// Phase 4: Profile
import ProfileScreen from '../screens/ProfileScreen';
import InvoiceManagerScreen from '../screens/apps/InvoiceManagerScreen';
import FinancialsScreen from '../screens/apps/FinancialsScreen';
import BillingScreen from '../screens/apps/BillingScreen';

// Phase 5: Prescription screens
import PrescriptionScreen from '../screens/prescription/PrescriptionScreen';
import FreehandCanvasScreen from '../screens/prescription/FreehandCanvasScreen';
import FreehandReviewScreen from '../screens/prescription/FreehandReviewScreen';

// Theme
import { useColors } from '../hooks/useColors';

// ---------------------------------------------------------------------------
// DashboardTabs — Bottom Tab Navigator + Stack for WebView sections
// ---------------------------------------------------------------------------
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Inner Tab Navigator ───
function TabNavigator() {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  
  // Responsive Height & Padding Logic
  // baseHeight represents the actual touchable content area.
  const baseHeight = 60; 
  // We add the device's physical bottom inset to push the content up into the safe viewing area.
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 10);
  const tabHeight = baseHeight + bottomInset;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: c.tabBar,
            borderTopWidth: 0,
            height: tabHeight,
            // Dynamically pad the bottom to exact inset height
            paddingBottom: bottomInset,
            // Small top padding to balance the vertical flex
            paddingTop: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 10,
            borderTopColor: c.tabBarBorder,
          },
          // Enforce centering for the items inside the tab bar
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: 4, // Balances the spacing between icon and label
          },
          tabBarActiveTintColor: c.brand,
          tabBarInactiveTintColor: c.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Vault"
          component={VaultScreen}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'server' : 'server-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Apps"
          component={AppsHubScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.centerTabIcon, { backgroundColor: c.brand, shadowColor: c.brand }]}>
                <Ionicons name={focused ? 'apps' : 'apps-outline'} size={24} color="#ffffff" />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tab.Screen
          name="Reviews"
          component={ReviewsScreen}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

// ─── Outer Stack Navigator ───
// Wraps the tab navigator so that SectionWebView can push on top of tabs
export default function DashboardTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="SectionWebView"
        component={SectionWebViewScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen 
        name="VideoModule" 
        component={VideoModuleScreen} 
        options={{ animation: 'fade' }} 
      />

      {/* Phase 2: Apps native screens */}
      <Stack.Screen
        name="BreathyDesk"
        component={BreathyDeskScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="InvoiceManager"
        component={InvoiceManagerScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Financials"
        component={FinancialsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ animation: 'slide_from_right' }} />
      {/* Phase 4: Profile & Settings */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AdditionalDetailsSettings"
        component={AdditionalDetailsSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AvailabilitySettings"
        component={AvailabilitySettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PrescriptionSettings"
        component={PrescriptionSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ReceptionistsSettings"
        component={ReceptionistsSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="HelpSettings" component={HelpScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TermsSettings" component={TermsScreen} options={{ animation: 'slide_from_right' }} />
      {/* Phase 5: Prescription screens */}
      <Stack.Screen
        name="Prescription"
        component={PrescriptionScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FreehandCanvas"
        component={FreehandCanvasScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="FreehandReview"
        component={FreehandReviewScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  centerTabIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed the dynamic OS-based margin bottom, substituting a static offset 
    // to cleanly float above the perfectly centered standard icons.
    marginTop: -24, 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});