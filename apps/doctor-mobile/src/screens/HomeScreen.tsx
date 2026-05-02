// apps/doctor-mobile/src/screens/HomeScreen.tsx

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';
import TodaysQueueWidget from '../components/TodaysQueueWidget';
import SharedHeader from '../components/SharedHeader';
import NotificationsPanel from '../components/NotificationsPanel';
import RecentPrescriptionsWidget from '../components/prescription/RecentPrescriptionsWidget';
import VideoCallsModal from '../components/VideoCallsModal';
import { useColors } from '../hooks/useColors';
import { useBreathySounds } from '../hooks/useBreathySounds';
import { posthog } from '../config/posthog';

// ---------------------------------------------------------------------------
// HomeScreen — Native Dashboard for Approved Doctors (Theme-Aware)
// ---------------------------------------------------------------------------

type DashboardSection = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  webPath?: string;
  nativeRoute?: string;
};

const DASHBOARD_SECTIONS: DashboardSection[] = [
  { icon: 'document-text', label: 'Prescriptions', nativeRoute: 'Prescription' },
  { icon: 'calendar', label: 'Calendar', nativeRoute: 'Calendar' },
  { icon: 'wallet', label: 'Transactions', nativeRoute: 'Billing' },
  { icon: 'cash-outline', label: 'Payout', nativeRoute: 'Financials' },
];

export default function HomeScreen() {
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const navigation = useNavigation<any>();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVideoCalls, setShowVideoCalls] = useState(false);
  const c = useColors();
  const { playPop } = useBreathySounds();

  // 1. Extract only the First Name by splitting at the first space
  const fullName = profileStatus?.full_name || 'Doctor';
  const doctorFirstName = fullName.split(' ')[0];
  
  const greeting = getGreeting();

  // Ref guard: prevents onPress from firing after onLongPress
  const longPressedRef = useRef(false);

  const handleSectionPress = useCallback((section: DashboardSection) => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    posthog.capture('dashboard_section_tapped', { section: section.label });
    if (section.nativeRoute) {
      navigation.navigate(section.nativeRoute);
    } else {
      navigation.navigate('SectionWebView', {
        title: section.label,
        path: section.webPath,
      });
    }
  }, [navigation]);

  const handleSectionLongPress = useCallback((section: DashboardSection) => {
    if (section.label === 'Prescriptions') {
      longPressedRef.current = true;
      playPop();
      setShowHistory(true);
    }
  }, [playPop]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SharedHeader
        onNotificationPress={() => setShowNotifications(true)}
        onProfilePress={() => navigation.navigate('Profile')}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + Video Call Button */}
        <View style={styles.header}>
          
          {/* 2. Added flex: 1 and paddingRight to ensure text never pushes icons out */}
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.greetingLabel, { color: c.textTertiary }]}>{greeting}</Text>
            
            {/* 3. Added numberOfLines={1} to truncate if still too long */}
            <Text style={[styles.doctorName, { color: c.text }]} numberOfLines={1}>
              Dr. {doctorFirstName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* NEW CHAT BUTTON */}
            <TouchableOpacity
              style={[styles.videoCallBtn, { backgroundColor: c.card }]}
              onPress={() => navigation.navigate('ChatList')}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubbles" size={22} color={c.brand} />
            </TouchableOpacity>
          
            {/* EXISTING VIDEO BUTTON */}
            <TouchableOpacity
              style={[styles.videoCallBtn, { backgroundColor: c.card }]}
              onPress={() => setShowVideoCalls(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam" size={22} color={c.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Action Strip */}
        <View style={styles.actionsStrip}>
          {DASHBOARD_SECTIONS.map((section) => (
            <Pressable
              key={section.label}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && { opacity: 0.7 },
              ]}
              onPressIn={() => { longPressedRef.current = false; }}
              onPress={() => handleSectionPress(section)}
              onLongPress={() => handleSectionLongPress(section)}
              delayLongPress={500}
            >
              <View style={[styles.actionIconBox, { backgroundColor: c.card }]}>
                <Ionicons name={section.icon} size={22} color={c.brand} />
              </View>
              <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{section.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Today's Queue — Native Widget */}
        <TodaysQueueWidget />
      </ScrollView>

      <NotificationsPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Prescription History — floating bottom sheet on long-press */}
      <RecentPrescriptionsWidget
        visible={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Video Calls Modal */}
      <VideoCallsModal
        visible={showVideoCalls}
        onClose={() => setShowVideoCalls(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greetingLabel: { fontSize: 13, fontWeight: '500' },
  doctorName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  videoCallBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionsStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actionItem: { alignItems: 'center', width: '23%' },
  actionIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});