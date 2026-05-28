import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Image, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import short from 'short-uuid';

// ---------------------------------------------------------------------------
// Transform: Flatten doctor_specialties join (mirrors web patientService.js)
// ---------------------------------------------------------------------------
const transformAppointment = (appt: any) => {
  if (!appt.doctors) return appt;
  return {
    ...appt,
    doctors: {
      ...appt.doctors,
      specialties: appt.doctors.doctor_specialties?.map(
        (jr: any) => jr.specialties
      ) || [],
    },
  };
};

export default function AppointmentsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchAppointments = async (pageNum: number = 0) => {
    if (!session?.user?.id) return;
    if (pageNum === 0) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();

      // Enhanced query — mirrors web's patientService.js exactly
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id, full_name, prefix, profile_photo_url, city,
            doctor_specialties (
              specialties ( name, id )
            )
          ),
          clinics:organization_id (id, name),
          patients:patient_id (full_name, email, phone_no),
          payments (*)
        `)
        .eq('patient_id', session.user.id);

      if (activeTab === 'upcoming') {
        query = query
          .gte('start_time', startOfToday)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .order('start_time', { ascending: true });
      } else {
        const PAGE_SIZE = 10;
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        query = query
          .or(`start_time.lt.${startOfToday},status.eq.completed,status.eq.cancelled`)
          .order('start_time', { ascending: false })
          .range(from, to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newItems = (data || []).map(transformAppointment);
      if (pageNum === 0) {
        setAppointments(newItems);
      } else {
        setAppointments(prev => [...prev, ...newItems]);
      }

      if (activeTab === 'past') {
        setHasMore(data?.length === 10);
        setPage(pageNum);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch appointments', error, { source: 'AppointmentsScreen' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchAppointments(0);
  }, [activeTab]);

  // Realtime subscription for new/updated appointments
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel('patient-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `patient_id=eq.${session.user.id}` },
        () => { fetchAppointments(0); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const onRefresh = () => { setIsRefreshing(true); setPage(0); fetchAppointments(0); };

  const loadMore = () => {
    if (activeTab === 'past' && !isFetchingMore && hasMore) {
      fetchAppointments(page + 1);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      Alert.alert('Success', 'Appointment cancelled.');
      fetchAppointments();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to cancel appointment.');
    }
  };

  const handleDownloadInvoice = async (item: any) => {
    try {
      const doctorName = item.doctors?.full_name || 'Doctor';
      const clinicName = item.clinics?.name || 'Clinic';
      const patientName = session?.user?.email || 'Patient';

      const htmlContent = `
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; padding: 20px;">
            <h1 style="color: #0d9488;">BREATHY TECHNOLOGIES</h1>
            <p style="color: #555;">Invoice for Appointment</p>
            <hr />
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Clinic:</strong> ${clinicName}</p>
            <p><strong>Date:</strong> ${dayjs(item.start_time).format('MMM D, YYYY h:mm A')}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <br/>
            <h3>Amount Paid: INR ${item.payments?.[0]?.amount || '0'}</h3>
            <p style="color: green; font-weight: bold;">Payment Status: SUCCESS</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to generate invoice.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#ecfdf5', text: '#059669' };
      case 'completed': return { bg: '#eff6ff', text: '#2563eb' };
      case 'cancelled': return { bg: '#fef2f2', text: '#dc2626' };
      case 'in_progress': return { bg: '#fff7ed', text: '#ea580c' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const AppointmentCard = ({ item }: { item: any }) => {
    const statusColors = getStatusColor(item.status);
    const specialtyNames = item.doctors?.specialties?.map((s: any) => s?.name).filter(Boolean).join(', ') || '';
    const paymentStatus = item.payments?.[0]?.status;
    const isVideo = item.appointment_type === 'video';
    const photoUrl = item.doctors?.profile_photo_url;
    const firstLetter = item.doctors?.full_name?.charAt(0)?.toUpperCase() || 'D';
    const appointmentTime = dayjs(item.start_time);
    const isToday = appointmentTime.isSame(dayjs(), 'day');

    const [queuePos, setQueuePos] = useState<number | null>(null);

    useEffect(() => {
      if (!isVideo && isToday && item.status !== 'completed' && item.status !== 'cancelled') {
        const fetchQueue = async () => {
          const { data } = await supabase
            .from('waitlist_entries')
            .select('*, clinic_sessions(status, current_token_number)')
            .eq('appointment_id', item.id)
            .maybeSingle();
          if (data && data.token_number && data.clinic_sessions?.current_token_number) {
            setQueuePos(data.token_number - data.clinic_sessions.current_token_number);
          }
        };
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000);
        return () => clearInterval(interval);
      }
    }, [item.id, isVideo, isToday, item.status]);

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.date, { color: c.text }]}>
            {dayjs(item.start_time).format('MMM D, YYYY • h:mm A')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Appointment type badge */}
            <View style={[styles.badge, { backgroundColor: isVideo ? '#ede9fe' : '#ecfdf5' }]}>
              <Text style={[styles.badgeText, { color: isVideo ? '#7c3aed' : '#059669' }]}>
                {isVideo ? 'VIDEO' : 'IN-PERSON'}
              </Text>
            </View>
            {/* Status badge */}
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {item.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.doctorInfo}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.doctorPhoto} />
          ) : (
            <View style={[styles.doctorPhotoPlaceholder, { backgroundColor: c.brandBg || '#e0f2f1' }]}>
              <Text style={[styles.placeholderLetter, { color: c.brand }]}>{firstLetter}</Text>
            </View>
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.doctorName, { color: c.text }]}>
              {item.doctors?.prefix || 'Dr.'} {item.doctors?.full_name}
            </Text>
            {specialtyNames ? (
              <Text style={[styles.specialtyLabel, { color: c.brand }]}>{specialtyNames}</Text>
            ) : null}
            <Text style={[styles.clinicName, { color: c.textSecondary }]}>
              {item.clinics?.name || (isVideo ? 'Online Consultation' : 'Clinic Visit')}
            </Text>
          </View>
        </View>

        {/* Payment status */}
        {paymentStatus && (
          <View style={[styles.paymentRow, { borderTopColor: c.border }]}>
            <Ionicons
              name={paymentStatus === 'PAID' ? 'checkmark-circle' : 'time-outline'}
              size={16}
              color={paymentStatus === 'PAID' ? '#059669' : '#ea580c'}
            />
            <Text style={[styles.paymentText, { color: paymentStatus === 'PAID' ? '#059669' : '#ea580c' }]}>
              Payment {paymentStatus}
            </Text>
            {item.payments?.[0]?.amount && (
              <Text style={[styles.paymentAmount, { color: c.textSecondary }]}>₹{item.payments[0].amount}</Text>
            )}
          </View>
        )}

        {/* Waitlist Position */}
        {queuePos !== null && queuePos >= 0 && (
          <View style={{ backgroundColor: c.brandBg, padding: 12, borderRadius: 8, marginTop: 12 }}>
            <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>
              Queue Status: You are #{queuePos > 0 ? queuePos : 'Next'} in line
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {activeTab === 'upcoming' && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: c.bg, borderColor: c.border }]} onPress={() => Alert.alert('Cancel Appointment', 'Are you sure you want to cancel?', [{ text: 'No' }, { text: 'Yes, Cancel', onPress: () => handleCancel(item.id) }])}>
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'upcoming' && isVideo && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1.5, backgroundColor: c.brand, borderColor: c.brand }]} onPress={() => navigation.navigate('VideoRoom', { appointmentId: item.id, doctorName: item.doctors?.full_name || 'Doctor' })}>
              <Ionicons name="videocam" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Join Call</Text>
            </TouchableOpacity>
          )}

          {(activeTab === 'past' || item.status === 'completed') && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: c.brand, borderColor: c.brand }]} onPress={() => handleDownloadInvoice(item)}>
              <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
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
        <View style={styles.center}><ActivityIndicator size="large" color={c.brand} /></View>
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
          renderItem={({ item }) => <AppointmentCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.brand} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  tabText: { fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  date: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  doctorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  doctorPhoto: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#f1f5f9' },
  doctorPhotoPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  placeholderLetter: { fontSize: 20, fontWeight: '700' },
  doctorName: { fontSize: 17, fontWeight: '700' },
  specialtyLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  clinicName: { fontSize: 13, marginTop: 2 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  paymentText: { fontSize: 13, fontWeight: '600' },
  paymentAmount: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
