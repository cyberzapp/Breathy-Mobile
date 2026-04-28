import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useColors } from '../hooks/useColors';

// ---------------------------------------------------------------------------
// OfflineGateScreen
// ---------------------------------------------------------------------------
// Shown to non-approved doctors when they are offline. Since onboarding,
// profile editing, and verification all require server connectivity, we
// gracefully block progress and encourage the user to connect to the internet.
//
// The screen auto-detects when connectivity is restored — no manual retry
// needed. The RootNavigator re-evaluates the condition automatically.
// ---------------------------------------------------------------------------

export default function OfflineGateScreen() {
  const { isOnline } = useNetworkStatus();
  const c = useColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={c.bg === '#0f172a' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      <View style={styles.container}>
        {/* Offline Illustration */}
        <View style={[styles.illustrationBox, { backgroundColor: c.cardAlt }]}>
          <Ionicons name="cloud-offline-outline" size={80} color="#cbd5e1" />
        </View>

        <Text style={[styles.title, { color: c.text }]}>No Internet Connection</Text>
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>
          Your profile setup requires a live connection to upload documents and
          verify your credentials. Please turn on Wi-Fi or mobile data to continue.
        </Text>

        {/* Connection Status Indicator */}
        <View style={[styles.statusPill, isOnline ? styles.statusOnline : styles.statusOffline]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? '#22c55e' : '#ef4444' },
            ]}
          />
          <Text
            style={[styles.statusText, { color: isOnline ? '#15803d' : '#b91c1c' }]}
          >
            {isOnline ? 'Connected — Redirecting...' : 'Waiting for connection...'}
          </Text>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: c.cardAlt }]}>
          <Text style={[styles.tipsTitle, { color: c.textSecondary }]}>Quick Tips</Text>
          <View style={styles.tipRow}>
            <Ionicons name="wifi-outline" size={18} color="#64748b" />
            <Text style={styles.tipText}>Check your Wi-Fi or Mobile Data settings</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="airplane-outline" size={18} color="#64748b" />
            <Text style={styles.tipText}>Make sure Airplane Mode is turned off</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="reload-outline" size={18} color="#64748b" />
            <Text style={styles.tipText}>
              This screen will automatically redirect once connected
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  illustrationBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
  },
  statusOnline: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusOffline: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Tips
  tipsCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
