import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';

export default function AppointmentsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAppointments = async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();

      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id, full_name, profile_photo_url, city
          ),
          clinics:organization_id (name)
        `)
        .eq('patient_id', session.user.id);

      if (activeTab === 'upcoming') {
        query = query
          .gte('start_time', startOfToday)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .order('start_time', { ascending: true });
      } else {
        query = query
          .or(`start_time.lt.${startOfToday},status.eq.completed,status.eq.cancelled`)
          .order('start_time', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Failed to fetch appointments', error, { source: 'AppointmentsScreen' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchAppointments();
  }, [activeTab]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAppointments();
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.date, { color: c.text }]}>
          {dayjs(item.start_time).format('MMM D, YYYY • h:mm A')}
        </Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'scheduled' ? c.brandBg : c.bg }]}>
          <Text style={[styles.badgeText, { color: item.status === 'scheduled' ? c.brand : c.textSecondary }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.doctorInfo}>
        <Ionicons name="person-circle-outline" size={40} color={c.textTertiary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[styles.doctorName, { color: c.text }]}>Dr. {item.doctors?.full_name}</Text>
          <Text style={[styles.clinicName, { color: c.textSecondary }]}>
            {item.clinics?.name || 'Online Consultation'}
          </Text>
        </View>
      </View>

      {activeTab === 'upcoming' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: c.brandBg }]}
            onPress={async () => {
              // Get video token and join room
              try {
                // If you already have the token from the backend, or need to fetch it
                // const { url, token } = await getDailyVideoToken(item.id);
                // For now, navigating to VideoRoom with placeholder
                // navigation.navigate('VideoRoom', { url: item.video_url, doctorName: item.doctors?.full_name });
                // We'll mock the navigation for the UI
              } catch (e) {
                console.error('Failed to join video call', e, { source: 'AppointmentsScreen' });
              }
            }}
          >
            <Text style={[styles.actionText, { color: c.brand }]}>Join Video Call</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.bg, borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[styles.actionText, { color: c.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>My Appointments</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && { borderBottomColor: c.brand, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'upcoming' ? c.brand : c.textSecondary }]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && { borderBottomColor: c.brand, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'past' ? c.brand : c.textSecondary }]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            No {activeTab} appointments found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.brand} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: '800' },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  tabText: { fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: { fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  doctorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  doctorName: { fontSize: 18, fontWeight: '700' },
  clinicName: { fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 8 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { fontWeight: '600', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 },
});
