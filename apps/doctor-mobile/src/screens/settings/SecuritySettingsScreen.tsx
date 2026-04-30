// apps/doctor-mobile/src/screens/settings/SecuritySettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../lib/apiClient';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';

// ---------------------------------------------------------------------------
// SecuritySettingsScreen — Native replica of web's SecuritySettings.jsx
// ---------------------------------------------------------------------------
// Features:
//   - On-Demand Visibility Toggle (online/offline)
//   - Login History (last 10 entries)
//   - Sign Out
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';

// ── API Functions ──
const fetchLoginHistory = () => apiClient.get('/api/auth/history/login');
const getVisibility = () => apiClient.get('/api/doctors/me/visibility');
const updateVisibility = (status: string) =>
  apiClient.put('/api/doctors/me/visibility', { on_demand_status: status });

// ── Helpers ──
const formatDateTime = (d: string) => {
  try {
    const date = new Date(d);
    const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${day} at ${time}`;
  } catch {
    return 'N/A';
  }
};

export default function SecuritySettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  
  const signOut = useAuthStore((s) => s.signOut);

  // ── Visibility State ──
  const [isOnline, setIsOnline] = useState(false);
  const [visLoading, setVisLoading] = useState(true);
  const [visSaving, setVisSaving] = useState(false);

  // ── Login History State ──
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);

  // ── Fetch Visibility ──
  useEffect(() => {
    (async () => {
      try {
        const data: any = await getVisibility();
        setIsOnline(data?.on_demand_status === 'online');
      } catch { }
      finally { setVisLoading(false); }
    })();
  }, []);

  // ── Fetch Login History ──
  useEffect(() => {
    (async () => {
      try {
        const data: any = await fetchLoginHistory();
        setLoginHistory(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setHistError(err.message || 'Failed to load login history.');
      } finally {
        setHistLoading(false);
      }
    })();
  }, []);

  // ── Toggle Visibility ──
  const handleToggle = async (value: boolean) => {
    setVisSaving(true);
    const newStatus = value ? 'online' : 'offline';
    try {
      await updateVisibility(newStatus);
      setIsOnline(value);
      Alert.alert('Updated', `Visibility set to "${newStatus}".`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update visibility.');
    } finally {
      setVisSaving(false);
    }
  };

  // ── Handle Sign Out ──
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Section: On-Demand Visibility ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>On-Demand Visibility</Text>
              <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
                Set yourself as 'Online' to receive immediate on-demand consultation requests.
              </Text>
            </View>
            {visLoading ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={handleToggle}
                disabled={visSaving}
                trackColor={{ false: '#cbd5e1', true: '#5eead4' }}
                thumbColor={isOnline ? BRAND : '#f1f5f9'}
              />
            )}
          </View>

          <View style={[styles.statusBox, { backgroundColor: c.cardAlt || '#f8fafc' }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16a34a' : '#94a3b8' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: c.text }]}>
                Your current status is: <Text style={{ color: isOnline ? '#16a34a' : '#64748b', fontWeight: '700' }}>{isOnline ? 'Online' : 'Offline'}</Text>
              </Text>
              <Text style={[styles.statusDesc, { color: c.textTertiary }]}>
                {isOnline
                  ? 'Patients can see you and initiate an instant video call.'
                  : 'You will not appear in on-demand search results.'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section: Login History ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Login History</Text>
          <Text style={[styles.cardSubtitle, { color: c.textTertiary, marginBottom: 16 }]}>
            Review recent login activity on your account.
          </Text>

          {histLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={BRAND} size="large" />
            </View>
          ) : histError ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{histError}</Text>
            </View>
          ) : loginHistory.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="shield-outline" size={40} color="#cbd5e1" />
              <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 10 }}>No login history found.</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.historyLabel, { color: c.textTertiary }]}>Recent Login History (Last 10)</Text>
              {loginHistory.map((entry: any, index: number) => (
                <View
                  key={entry.id || index}
                  style={[
                    styles.historyRow,
                    index < loginHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: c.cardAlt || '#f8fafc' }]}>
                    <Ionicons name="desktop-outline" size={18} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyIp, { color: c.text }]}>IP: {entry.ip_address || 'N/A'}</Text>
                    <Text style={[styles.historyDevice, { color: c.textTertiary }]} numberOfLines={1}>
                      {entry.device_info || 'Unknown device'}
                    </Text>
                  </View>
                  <Text style={[styles.historyTime, { color: c.textTertiary }]}>
                    {formatDateTime(entry.created_at)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Sign Out Button ── */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: c.errorBg || '#fef2f2', borderColor: c.errorBorder || '#fecaca' }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={c.error || '#ef4444'} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.error || '#ef4444' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 19 },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 14, fontWeight: '600' },
  statusDesc: { fontSize: 12, marginTop: 2 },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },

  historyLabel: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  historyIp: { fontSize: 14, fontWeight: '600' },
  historyDevice: { fontSize: 12, marginTop: 2 },
  historyTime: { fontSize: 11, textAlign: 'right', maxWidth: 100 },
  
  signOutButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    borderRadius: 14, 
    paddingVertical: 15, 
    marginTop: 12, 
    borderWidth: 1 
  },
});